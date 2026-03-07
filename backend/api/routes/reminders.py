from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, ValidationError, field_validator

reminders_bp = Blueprint("reminders", __name__, url_prefix="/api/reminders")


@dataclass
class Reminder:
    id: str
    user_id: str
    text: str
    reminder_type: str  # casual | dated
    date: str | None
    completed: bool
    created_at: str
    updated_at: str


user_reminders: dict[str, list[Reminder]] = defaultdict(list)


class CreateReminderRequest(BaseModel):
    text: str
    reminderType: str
    date: str | None = None
    userId: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Reminder text is required")
        return cleaned

    @field_validator("reminderType")
    @classmethod
    def validate_type(cls, value: str) -> str:
        if value not in {"casual", "dated"}:
            raise ValueError("reminderType must be casual or dated")
        return value


class UpdateReminderRequest(BaseModel):
    text: str | None = None
    date: str | None = None
    completed: bool | None = None
    userId: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_reminder(user_id: str, reminder_id: str) -> Reminder | None:
    for reminder in user_reminders[user_id]:
        if reminder.id == reminder_id:
            return reminder
    return None


@reminders_bp.get("")
def list_reminders():
    user_id = request.args.get("userId", "anon")
    r_type = request.args.get("type")
    items = user_reminders[user_id]
    if r_type in {"casual", "dated"}:
        items = [item for item in items if item.reminder_type == r_type]
    return jsonify({"ok": True, "items": [asdict(item) for item in items]})


@reminders_bp.post("")
def create_reminder():
    try:
        payload = CreateReminderRequest.model_validate(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"ok": False, "error": "Invalid request", "details": exc.errors()}), 400

    now = _now_iso()
    reminder = Reminder(
        id=str(uuid.uuid4()),
        user_id=payload.userId,
        text=payload.text,
        reminder_type=payload.reminderType,
        date=payload.date,
        completed=False,
        created_at=now,
        updated_at=now,
    )
    user_reminders[payload.userId].append(reminder)
    return jsonify({"ok": True, "item": asdict(reminder)}), 201


@reminders_bp.patch("/<reminder_id>")
def update_reminder(reminder_id: str):
    try:
        payload = UpdateReminderRequest.model_validate(request.get_json(force=True) or {})
    except ValidationError as exc:
        return jsonify({"ok": False, "error": "Invalid request", "details": exc.errors()}), 400

    reminder = _find_reminder(payload.userId, reminder_id)
    if not reminder:
        return jsonify({"ok": False, "error": "Reminder not found"}), 404

    if payload.text is not None:
        reminder.text = payload.text.strip()
    if payload.date is not None:
        reminder.date = payload.date
    if payload.completed is not None:
        reminder.completed = payload.completed
    reminder.updated_at = _now_iso()
    return jsonify({"ok": True, "item": asdict(reminder)})


@reminders_bp.delete("/<reminder_id>")
def delete_reminder(reminder_id: str):
    user_id = request.args.get("userId", "anon")
    items = user_reminders[user_id]
    for idx, item in enumerate(items):
        if item.id == reminder_id:
            del items[idx]
            return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "Reminder not found"}), 404
