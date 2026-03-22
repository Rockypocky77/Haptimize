from __future__ import annotations

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, ValidationError, field_validator

from services.ai_usage import add_usage, get_today_usage, get_user_plan
from services.content_safety import (
    check_prompt_injection,
    moderate_with_openai,
    sanitize_actions,
    sanitize_text,
)
from services.openai_service import OpenAIService
from services.plan_limits import get_ai_tokens_limit
from services.rate_limit import ai_rate_limiter

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")
openai_service = OpenAIService()

INJECTION_REPLY = "I can only help with habits, reminders, and calendar tasks. What can I do for you?"
FLAGGED_REPLY = "Let's keep things positive! How can I help with your productivity?"


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    humanize: bool = False

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        if len(cleaned) > 2000:
            raise ValueError("Message too long (max 2000 characters)")
        return cleaned


def _get_uid() -> str:
    return request.headers.get("X-User-Id", "").strip() or "anon"


def _get_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    return forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "unknown")


def _check_rate_limits() -> dict | None:
    uid = _get_uid()
    ip = _get_ip()
    key = f"ai:{uid}:{ip}"

    minute_check = ai_rate_limiter.check(f"{key}:min", max_requests=20, window_seconds=60)
    if not minute_check.allowed:
        return {"ok": False, "error": "Rate limit exceeded (20/min)", "retryAfterSeconds": minute_check.retry_after_seconds}

    hour_check = ai_rate_limiter.check(f"{key}:hr", max_requests=500, window_seconds=3600)
    if not hour_check.allowed:
        return {"ok": False, "error": "Rate limit exceeded (500/hr)", "retryAfterSeconds": hour_check.retry_after_seconds}

    return None


@ai_bp.post("/chat")
def chat():
    rate_error = _check_rate_limits()
    if rate_error:
        return jsonify(rate_error), 429

    uid = _get_uid()
    if uid and uid != "anon":
        plan = get_user_plan(uid)
        limit = get_ai_tokens_limit(plan)
        used = get_today_usage(uid)
        if used >= limit:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": (
                            f"You've reached your daily AI limit ({limit:,} tokens). "
                            "Upgrade to Pro for 30k/day or Max for 100k/day."
                        ),
                    }
                ),
                429,
            )

    try:
        payload = ChatRequest.model_validate(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"ok": False, "error": "Invalid request", "details": exc.errors()}), 400

    if check_prompt_injection(payload.message):
        return jsonify({"ok": True, "reply": INJECTION_REPLY})

    if moderate_with_openai(openai_service.client, payload.message):
        return jsonify({"ok": True, "reply": FLAGGED_REPLY})

    history = [{"role": m.role, "content": m.content} for m in payload.history[-10:]]
    result = openai_service.chat(payload.message, history=history, humanize=payload.humanize)
    if not result.ok:
        return jsonify({"ok": False, "error": result.error or "AI service failure"}), 502

    if uid and uid != "anon" and result.usage_total_tokens > 0:
        add_usage(uid, result.usage_total_tokens)

    reply = sanitize_text(result.message) if result.message else result.message
    actions = sanitize_actions(result.actions)

    response: dict = {"ok": True, "reply": reply}
    if actions:
        response["actions"] = actions

    return jsonify(response)
