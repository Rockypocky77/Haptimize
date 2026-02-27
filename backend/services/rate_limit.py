from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass


@dataclass
class RateLimitResult:
    allowed: bool
    retry_after_seconds: int = 0


class InMemoryRateLimiter:
    """
    Simple in-memory rate limiter.
    Replace with Redis for production multi-instance deployments.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, max_requests: int, window_seconds: int) -> RateLimitResult:
        now = time.time()
        start = now - window_seconds
        queue = self._hits[key]

        while queue and queue[0] < start:
            queue.popleft()

        if len(queue) >= max_requests:
            retry_after = int(max(1, window_seconds - (now - queue[0])))
            return RateLimitResult(allowed=False, retry_after_seconds=retry_after)

        queue.append(now)
        return RateLimitResult(allowed=True)


verification_rate_limiter = InMemoryRateLimiter()
ai_rate_limiter = InMemoryRateLimiter()
