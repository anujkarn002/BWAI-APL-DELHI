"""In-memory rate limiter using token-bucket algorithm.

Designed for single-instance Cloud Run. For multi-instance, swap the
in-memory store for Redis or Firestore-backed counters.

Usage:
    from app.ratelimit import RateLimiter, rate_limit

    # As a dependency
    otp_limiter = RateLimiter(requests=5, window=300)  # 5 per 5 min

    @router.post("/request-otp")
    async def request_otp(body: ..., _=Depends(rate_limit(otp_limiter))):
        ...

    # Or as middleware for global limits
"""

import time
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from fastapi import Depends, HTTPException, Request

log = logging.getLogger("stadiumbite.ratelimit")

# Cleanup stale entries every N calls to avoid unbounded memory growth
_CLEANUP_INTERVAL = 500
_call_count = 0


@dataclass
class _Bucket:
    tokens: float
    last_refill: float


@dataclass
class RateLimiter:
    """Token-bucket rate limiter.

    Args:
        requests: Max requests allowed in the window.
        window: Window size in seconds.
        key_func: Optional callable(Request) -> str to extract a custom key.
                  Defaults to client IP.
    """
    requests: int
    window: int
    key_func: Callable | None = None
    _buckets: dict[str, _Bucket] = field(default_factory=dict, repr=False)

    def _get_key(self, request: Request) -> str:
        if self.key_func:
            return self.key_func(request)
        # Use X-Forwarded-For (Cloud Run sets this) or fall back to client IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, request: Request) -> None:
        """Consume a token or raise 429."""
        global _call_count
        _call_count += 1
        if _call_count % _CLEANUP_INTERVAL == 0:
            self._cleanup()

        key = self._get_key(request)
        now = time.monotonic()
        bucket = self._buckets.get(key)

        if bucket is None:
            # First request from this key
            self._buckets[key] = _Bucket(tokens=self.requests - 1, last_refill=now)
            return

        # Refill tokens based on elapsed time
        elapsed = now - bucket.last_refill
        refill = elapsed * (self.requests / self.window)
        bucket.tokens = min(self.requests, bucket.tokens + refill)
        bucket.last_refill = now

        if bucket.tokens < 1:
            retry_after = int(self.window / self.requests)
            log.warning("Rate limit exceeded for %s on %s", key, request.url.path)
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Try again in {retry_after}s.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.tokens -= 1

    def _cleanup(self) -> None:
        """Remove entries that haven't been seen in 2x the window."""
        now = time.monotonic()
        cutoff = now - (self.window * 2)
        stale = [k for k, b in self._buckets.items() if b.last_refill < cutoff]
        for k in stale:
            del self._buckets[k]
        if stale:
            log.debug("Cleaned up %d stale rate-limit entries", len(stale))


def rate_limit(limiter: RateLimiter):
    """FastAPI dependency that enforces the given rate limiter."""
    async def _check(request: Request):
        limiter.check(request)
    return _check


# ── Pre-configured limiters ─────────────────────────────────
# Auth: prevent OTP brute-force
auth_otp_request = RateLimiter(requests=5, window=300)      # 5 OTP requests per 5 min per IP
auth_otp_verify = RateLimiter(requests=10, window=300)       # 10 verify attempts per 5 min per IP

# Reviews: prevent spam
review_submit = RateLimiter(requests=10, window=300)         # 10 reviews per 5 min per IP
review_edit = RateLimiter(requests=20, window=300)           # 20 edits per 5 min per IP

# AI: protect Gemini token budget
classify_image = RateLimiter(requests=10, window=60)         # 10 classifications per min per IP

# Read endpoints: generous but bounded
read_api = RateLimiter(requests=60, window=60)               # 60 reads per min per IP

# SSE: limit concurrent connections (1 connect per 5s per IP)
sse_connect = RateLimiter(requests=3, window=15)             # 3 SSE connections per 15s per IP

# Global: catch-all for any endpoint
global_limit = RateLimiter(requests=120, window=60)          # 120 requests/min per IP
