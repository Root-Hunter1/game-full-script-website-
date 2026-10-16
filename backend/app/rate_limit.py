import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


def get_client_ip(request: Request) -> str:
    """Real visitor IP. Forwarded headers are trusted only when the
    connection comes from this machine itself (nginx / tunnel on the same
    server), so outsiders cannot fake their IP."""
    host = request.client.host if request.client else "unknown"

    if host in ("127.0.0.1", "::1"):
        forwarded = (
            request.headers.get("cf-connecting-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        )
        if forwarded:
            return forwarded

    return host


class RateLimiter:
    """Allow at most `max_requests` per `window_seconds` for each IP."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.hits = defaultdict(deque)

    async def __call__(self, request: Request):
        ip = get_client_ip(request)
        now = time.monotonic()

        # Keep memory small: drop IPs that are no longer being counted.
        if len(self.hits) > 10000:
            for key in list(self.hits):
                queue = self.hits[key]
                if not queue or now - queue[-1] > self.window_seconds:
                    del self.hits[key]

        queue = self.hits[ip]

        while queue and now - queue[0] > self.window_seconds:
            queue.popleft()

        if len(queue) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - queue[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many attempts. Please wait a minute and try again.",
                headers={"Retry-After": str(retry_after)},
            )

        queue.append(now)


# 5 attempts per minute for each IP
login_limiter = RateLimiter(max_requests=5, window_seconds=60)
forgot_password_limiter = RateLimiter(max_requests=5, window_seconds=60)
