from __future__ import annotations

import logging
import re

from openai import OpenAI

logger = logging.getLogger(__name__)

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)",
    r"(repeat|show|reveal|print|output|display|tell me)\s+(your|the|all)?\s*(system\s*prompt|instructions|rules|configuration)",
    r"you\s+are\s+now\s+(?!hapti)",
    r"pretend\s+(you\s+are|to\s+be)",
    r"act\s+as\s+(a|an|if)",
    r"(forget|disregard|override)\s+(everything|all|your|previous)",
    r"do\s+not\s+follow\s+(your|the)\s+(rules|instructions)",
    r"new\s+instructions?\s*:",
    r"system\s*:\s*you\s+are",
    r"\bDAN\b",
    r"jailbreak",
]

_injection_re = re.compile(
    "|".join(PROMPT_INJECTION_PATTERNS), re.IGNORECASE
)


def check_prompt_injection(text: str) -> bool:
    return bool(_injection_re.search(text))


def sanitize_text(text: str) -> str:
    # Strip dangerous HTML/script content; do NOT html.escape - the frontend
    # renders as plain text and React escapes HTML safely. Escaping here caused
    # apostrophes to display as &#x27; etc.
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"javascript:", "", text, flags=re.IGNORECASE)
    return text.strip()


def sanitize_actions(actions: list[dict] | None) -> list[dict] | None:
    if not actions:
        return actions
    cleaned = []
    for a in actions:
        safe = dict(a)
        if "text" in safe and isinstance(safe["text"], str):
            safe["text"] = sanitize_text(safe["text"])
        if "title" in safe and isinstance(safe["title"], str):
            safe["title"] = sanitize_text(safe["title"])
        cleaned.append(safe)
    return cleaned


def moderate_with_openai(client: OpenAI | None, text: str) -> bool:
    """Returns True if the content is flagged as harmful."""
    if not client:
        return False
    try:
        response = client.moderations.create(
            model="omni-moderation-latest",
            input=text,
        )
        return response.results[0].flagged if response.results else False
    except Exception as exc:
        logger.warning("Moderation API error (allowing message): %s", exc)
        return False
