from __future__ import annotations

import os
from dataclasses import dataclass

import requests


@dataclass
class EmailSendResult:
    ok: bool
    error: str | None = None


class ResendService:
    API_URL = "https://api.resend.com/emails"

    def __init__(self) -> None:
        self.api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("RESEND_FROM_EMAIL", "Haptimize <noreply@haptimize.app>")
        self.mock_mode = os.getenv("ALLOW_MOCK_EMAIL", "true").lower() == "true"

    def send_verification_code(self, email: str, code: str, expires_minutes: int = 2) -> EmailSendResult:
        if not self.api_key:
            if self.mock_mode:
                return EmailSendResult(ok=True)
            return EmailSendResult(ok=False, error="Missing RESEND_API_KEY")

        payload = {
            "from": self.from_email,
            "to": [email],
            "subject": "Your Haptimize verification code",
            "html": (
                f"<p>Your verification code is <strong>{code}</strong>.</p>"
                f"<p>This code expires in {expires_minutes} minutes.</p>"
            ),
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        response = requests.post(self.API_URL, headers=headers, json=payload, timeout=10)
        if response.status_code >= 400:
            return EmailSendResult(ok=False, error=f"Resend error {response.status_code}: {response.text}")
        return EmailSendResult(ok=True)
