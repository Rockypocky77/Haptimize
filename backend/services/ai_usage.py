"""Track and check AI token usage per user per day."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from google.cloud.firestore import Client as FirestoreClient


def _get_firestore():
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception:
        return None


def get_user_plan(uid: str) -> str:
    """Get user plan from Firestore. Returns 'free' if not found or on error."""
    db = _get_firestore()
    if not db:
        return "free"
    try:
        doc_ref = db.collection("users").document(uid)
        snap = doc_ref.get()
        if snap and snap.exists:
            data = snap.to_dict()
            plan = data.get("plan")
            if plan in ("free", "pro", "max"):
                return plan
    except Exception:
        pass
    return "free"


def get_today_usage(uid: str) -> int:
    """Get today's AI token usage for user."""
    db = _get_firestore()
    if not db:
        return 0
    try:
        today = date.today().isoformat()
        doc_ref = db.collection("aiUsage").document(uid).collection("daily").document(today)
        snap = doc_ref.get()
        if snap and snap.exists:
            return int(snap.to_dict().get("tokens", 0))
    except Exception:
        pass
    return 0


def add_usage(uid: str, tokens: int) -> None:
    """Add token usage for today."""
    if tokens <= 0:
        return
    db = _get_firestore()
    if not db:
        return
    try:
        from google.cloud.firestore_v1.transforms import Increment
        today = date.today().isoformat()
        doc_ref = db.collection("aiUsage").document(uid).collection("daily").document(today)
        doc_ref.set({"tokens": Increment(tokens)}, merge=True)
    except Exception:
        pass
