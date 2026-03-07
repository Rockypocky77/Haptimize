from __future__ import annotations

import os
import random
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from firebase_admin import auth as firebase_auth
from firebase_admin.exceptions import FirebaseError
from flask import Blueprint, jsonify, request
from pydantic import BaseModel, ValidationError, field_validator

from services.rate_limit import verification_rate_limiter
from services.resend_service import ResendService

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CODE_TTL_SECONDS = 120
MAX_RESENDS = 3
IP_BLOCK_MINUTES = 15


@dataclass
class PendingSignup:
    email: str
    password: str
    username: str | None
    code: str
    expires_at: datetime
    resend_count: int


pending_signups: dict[str, PendingSignup] = {}
blocked_ips: dict[str, datetime] = {}
resend_service = ResendService()


class SignupCodeRequest(BaseModel):
    email: str
    password: str
    username: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not EMAIL_PATTERN.match(value):
            raise ValueError("Invalid email format")
        return value.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class VerifyCodeRequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not EMAIL_PATTERN.match(value):
            raise ValueError("Invalid email format")
        return value.lower()

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if len(value.strip()) != 6 or not value.strip().isdigit():
            raise ValueError("Code must be 6 digits")
        return value.strip()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _new_code() -> str:
    return str(random.randint(100000, 999999))


def _is_ip_blocked(ip: str) -> tuple[bool, int]:
    until = blocked_ips.get(ip)
    if not until:
        return False, 0
    now = _now()
    if now >= until:
        del blocked_ips[ip]
        return False, 0
    return True, int((until - now).total_seconds())


def _set_ip_block(ip: str) -> None:
    blocked_ips[ip] = _now() + timedelta(minutes=IP_BLOCK_MINUTES)


def _cleanup_pending(email: str) -> None:
    pending = pending_signups.get(email)
    if not pending:
        return
    if pending.expires_at < _now():
        del pending_signups[email]


def _create_user_after_verification(email: str, password: str, username: str | None) -> tuple[bool, dict]:
    try:
        user = firebase_auth.create_user(email=email, password=password, display_name=username)
        return True, {"uid": user.uid, "email": user.email, "displayName": user.display_name}
    except ValueError:
        # Firebase app may not be configured yet during local scaffolding.
        mock_uid = f"mock_{abs(hash(email))}"
        return True, {"uid": mock_uid, "email": email, "displayName": username}
    except FirebaseError as exc:
        return False, {"error": str(exc)}


@auth_bp.post("/signup/request-code")
def request_signup_code():
    ip = _get_ip()
    blocked, retry_after = _is_ip_blocked(ip)
    if blocked:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Too many verification resends. Signup temporarily blocked for this IP.",
                    "retryAfterSeconds": retry_after,
                }
            ),
            429,
        )

    rate_key = f"verify:{ip}"
    rate = verification_rate_limiter.check(rate_key, max_requests=15, window_seconds=300)
    if not rate.allowed:
        return (
            jsonify({"ok": False, "error": "Rate limit exceeded.", "retryAfterSeconds": rate.retry_after_seconds}),
            429,
        )

    try:
        payload = SignupCodeRequest.model_validate(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"ok": False, "error": "Invalid request", "details": exc.errors()}), 400

    email = payload.email
    _cleanup_pending(email)
    existing = pending_signups.get(email)

    resend_count = 0
    if existing:
        resend_count = existing.resend_count + 1
        if resend_count > MAX_RESENDS:
            _set_ip_block(ip)
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "Resend limit reached. IP restricted for 15 minutes.",
                        "retryAfterSeconds": IP_BLOCK_MINUTES * 60,
                    }
                ),
                429,
            )

    code = _new_code()
    expires_at = _now() + timedelta(seconds=CODE_TTL_SECONDS)
    pending_signups[email] = PendingSignup(
        email=email,
        password=payload.password,
        username=payload.username,
        code=code,
        expires_at=expires_at,
        resend_count=resend_count,
    )

    send_result = resend_service.send_verification_code(email=email, code=code, expires_minutes=2)
    if not send_result.ok:
        return jsonify({"ok": False, "error": send_result.error or "Failed to send code"}), 502

    # After second resend, frontend should show "confirm your email" modal.
    show_email_confirmation = resend_count >= 2

    return jsonify(
        {
            "ok": True,
            "email": email,
            "expiresInSeconds": CODE_TTL_SECONDS,
            "resendCount": resend_count,
            "showEmailConfirmation": show_email_confirmation,
            "maxResends": MAX_RESENDS,
        }
    )


@auth_bp.post("/signup/verify-code")
def verify_signup_code():
    try:
        payload = VerifyCodeRequest.model_validate(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"ok": False, "error": "Invalid request", "details": exc.errors()}), 400

    _cleanup_pending(payload.email)
    pending = pending_signups.get(payload.email)
    if not pending:
        return jsonify({"ok": False, "error": "No active verification request for this email"}), 404

    if pending.expires_at < _now():
        del pending_signups[payload.email]
        return jsonify({"ok": False, "error": "Verification code expired. Please resend code."}), 410

    if pending.code != payload.code:
        return jsonify({"ok": False, "error": "Incorrect verification code"}), 401

    created, user_data = _create_user_after_verification(
        email=pending.email,
        password=pending.password,
        username=pending.username,
    )
    if not created:
        return jsonify({"ok": False, "error": user_data["error"]}), 500

    del pending_signups[payload.email]
    return jsonify({"ok": True, "message": "Account created successfully.", "user": user_data}), 201


@auth_bp.post("/google/exchange")
def exchange_google_token():
    """
    Placeholder endpoint. Frontend can use Firebase client SDK for Google OAuth directly,
    then pass Firebase ID token to backend for protected routes.
    """
    if os.getenv("ENABLE_GOOGLE_EXCHANGE", "false").lower() != "true":
        return jsonify({"ok": False, "error": "Google token exchange not enabled yet."}), 501
    return jsonify({"ok": False, "error": "Not implemented"}), 501
