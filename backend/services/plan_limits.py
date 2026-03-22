"""Plan limits for subscription tiers."""

from __future__ import annotations

PLAN_AI_TOKENS_PER_DAY: dict[str, int] = {
    "free": 5_000,
    "pro": 30_000,
    "max": 100_000,
}


def get_ai_tokens_limit(plan: str) -> int:
    return PLAN_AI_TOKENS_PER_DAY.get(plan, 5_000)
