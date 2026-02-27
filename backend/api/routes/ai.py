from __future__ import annotations

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, ValidationError, field_validator

from services.openai_service import OpenAIService
from services.rate_limit import ai_rate_limiter

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")
openai_service = OpenAIService()


class ChatRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        if len(cleaned) > 4000:
            raise ValueError("Message too long")
        return cleaned


def _get_rate_key() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "unknown")
    uid = request.headers.get("X-User-Id", "anon")
    return f"ai:{uid}:{ip}"


@ai_bp.post("/chat")
def chat():
    rate = ai_rate_limiter.check(_get_rate_key(), max_requests=40, window_seconds=3600)
    if not rate.allowed:
        return jsonify({"ok": False, "error": "AI rate limit exceeded", "retryAfterSeconds": rate.retry_after_seconds}), 429

    try:
        payload = ChatRequest.model_validate(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"ok": False, "error": "Invalid request", "details": exc.errors()}), 400

    result = openai_service.chat(payload.message)
    if not result.ok:
        return jsonify({"ok": False, "error": result.error or "AI service failure"}), 502

    return jsonify({"ok": True, "reply": result.message})
