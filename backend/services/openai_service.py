from __future__ import annotations

import os
from dataclasses import dataclass

from openai import OpenAI


@dataclass
class ChatResult:
    ok: bool
    message: str
    error: str | None = None


class OpenAIService:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def chat(self, user_message: str) -> ChatResult:
        if not self.client:
            return ChatResult(
                ok=True,
                message=(
                    "AI is currently running in mock mode. "
                    "Set OPENAI_API_KEY to enable live Hapti AI responses."
                ),
            )

        response = self.client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are Hapti AI: motivational, grounded, concise, and practical. "
                        "You can help users plan habits and reminders."
                    ),
                },
                {"role": "user", "content": user_message},
            ],
        )
        return ChatResult(ok=True, message=response.output_text or "I can help with your habits today.")
