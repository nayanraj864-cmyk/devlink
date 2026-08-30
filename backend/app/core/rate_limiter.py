"""
Tier-Aware Redis-Backed API Rate Limiter (#1061)

Provides multi-tier sliding window and token bucket rate limiting with Redis backing,
graceful in-memory fallback, user tier discrimination (authenticated vs unauthenticated),
IP / internal service token bypass, and standard HTTP 429 & X-RateLimit headers.
"""

from __future__ import annotations

import collections
import dataclasses
import enum
import functools
import logging
import math
import os
import re
import sys
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.client_address import client_address
from app.core.config import settings

logger = logging.getLogger(__name__)

is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "true"
force_rate_limits = os.getenv("TEST_RATE_LIMITS", "false").lower() in ("true", "1")


class RateLimitTier(str, enum.Enum):
    ANONYMOUS = "anonymous"
    AUTHENTICATED = "authenticated"
    PREMIUM = "premium"
    ADMIN = "admin"
    BYPASS = "bypass"


@dataclasses.dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_seconds: int
    retry_after: int
    tier: str


def parse_rate_limit_string(limit_str: str) -> Tuple[int, int, int]:
    """
    Parses strings like '100/minute', '5/second', '3/hour', '10/15minutes', '500/day'
    and optionally '100/minute burst 200' into (max_requests, window_seconds, burst).
    If burst is not specified, it defaults to max_requests.
    """
    cleaned = limit_str.strip().lower()
    
    # Check for burst suffix
    burst_val = None
    burst_match = re.search(r'\s+burst\s+(\d+)$', cleaned)
    if burst_match:
        burst_val = int(burst_match.group(1))
        cleaned = cleaned[:burst_match.start()].strip()

    if "/" not in cleaned:
        raise ValueError(f"Invalid rate limit format: {limit_str}. Expected 'count/period'")

    count_str, period_str = cleaned.split("/", 1)
    count = int(count_str.strip())

    unit_multipliers = {
        "s": 1,
        "sec": 1,
        "second": 1,
        "seconds": 1,
        "m": 60,
        "min": 60,
        "minute": 60,
        "minutes": 60,
        "h": 3600,
        "hr": 3600,
        "hour": 3600,
        "hours": 3600,
        "d": 86400,
        "day": 86400,
        "days": 86400,
    }

    period_str = period_str.strip()
    match = re.match(r"^(\d+)?\s*([a-z]+)$", period_str)
    if not match:
        raise ValueError(f"Invalid period format: {period_str}")

    multiplier = int(match.group(1)) if match.group(1) else 1
    unit = match.group(2)

    if unit not in unit_multipliers:
        raise ValueError(f"Unknown time unit: {unit}")

    window_seconds = multiplier * unit_multipliers[unit]
    burst = burst_val if burst_val is not None else count
    return count, window_seconds, burst


class InMemorySlidingWindowStore:
    """Thread-safe in-memory sliding window counter for local/fallback use."""

    def __init__(self):
        self._lock = threading.Lock()
        self._hits: Dict[str, collections.deque] = {}

    def is_allowed(
        self, key: str, max_requests: int, window_seconds: int
    ) -> Tuple[bool, int, int, int]:
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            if key not in self._hits:
                self._hits[key] = collections.deque()

            dq = self._hits[key]

            # Remove timestamps outside the sliding window
            while dq and dq[0] <= window_start:
                dq.popleft()

            current_count = len(dq)
            if current_count < max_requests:
                dq.append(now)
                remaining = max_requests - current_count - 1
                reset_seconds = int(window_seconds - (now - dq[0])) if dq else window_seconds
                return True, max_requests, max(0, remaining), max(1, reset_seconds)
            else:
                oldest_hit = dq[0]
                retry_after = max(1, int(math.ceil(oldest_hit + window_seconds - now)))
                reset_seconds = retry_after
                return False, max_requests, 0, reset_seconds

    def reset(self):
        with self._lock:
            self._hits.clear()


class InMemoryTokenBucketStore:
    """Thread-safe in-memory token bucket for local/fallback use."""

    def __init__(self):
        self._lock = threading.Lock()
        # key -> (tokens_remaining, last_refill_timestamp)
        self._buckets: Dict[str, Tuple[float, float]] = {}

    def is_allowed(
        self, key: str, max_requests: int, window_seconds: int, burst: int
    ) -> Tuple[bool, int, int, int]:
        now = time.time()
        refill_rate = max_requests / window_seconds

        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = (burst, now)

            tokens, last_refill = self._buckets[key]
            
            # Refill tokens based on time passed
            time_passed = now - last_refill
            tokens = min(burst, tokens + time_passed * refill_rate)
            
            if tokens >= 1:
                # Consume a token
                tokens -= 1
                self._buckets[key] = (tokens, now)
                
                remaining = int(tokens)
                # Calculate time to refill completely
                reset_seconds = max(1, int((burst - tokens) / refill_rate)) if refill_rate > 0 else window_seconds
                return True, burst, max(0, remaining), reset_seconds
            else:
                self._buckets[key] = (tokens, now)
                
                # Time until 1 token is available
                retry_after = max(1, int(math.ceil((1 - tokens) / refill_rate))) if refill_rate > 0 else window_seconds
                return False, burst, 0, retry_after

    def reset(self):
        with self._lock:
            self._buckets.clear()


class RedisSlidingWindowStore:
    """Redis-backed sliding window counter using Redis Sorted Sets."""

    def __init__(self, redis_client: Any = None):
        self._client = redis_client

    def _get_client(self):
        if self._client is not None:
            return self._client
        import redis

        uri = settings.RATE_LIMIT_STORAGE_URI.strip() or settings.REDIS_URL
        self._client = redis.from_url(uri, decode_responses=True)
        return self._client

    def is_allowed(
        self, key: str, max_requests: int, window_seconds: int
    ) -> Tuple[bool, int, int, int]:
        client = self._get_client()
        now = time.time()
        window_start = now - window_seconds
        member_id = f"{now}:{os.urandom(4).hex()}"

        pipe = client.pipeline()
        pipe.zremrangebyscore(key, "-inf", window_start)
        pipe.zcard(key)
        pipe.zrange(key, 0, 0, withscores=True)
        rem_res, current_count, oldest_entries = pipe.execute()

        if current_count < max_requests:
            pipe = client.pipeline()
            pipe.zadd(key, {member_id: now})
            pipe.expire(key, window_seconds + 5)
            pipe.execute()

            remaining = max_requests - current_count - 1
            if oldest_entries:
                oldest_ts = oldest_entries[0][1]
                reset_seconds = max(1, int(window_seconds - (now - oldest_ts)))
            else:
                reset_seconds = window_seconds
            return True, max_requests, max(0, remaining), reset_seconds
        else:
            oldest_ts = oldest_entries[0][1] if oldest_entries else window_start
            retry_after = max(1, int(math.ceil(oldest_ts + window_seconds - now)))
            return False, max_requests, 0, retry_after


class RedisTokenBucketStore:
    """Redis-backed token bucket using a Lua script for atomicity."""

    def __init__(self, redis_client: Any = None):
        self._client = redis_client
        self._script_sha = None

        # Lua script to atomically refill and consume tokens
        self._lua_script = """
        local key = KEYS[1]
        local burst = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])
        
        if not tokens or not last_refill then
            tokens = burst
            last_refill = now
        end
        
        local time_passed = math.max(0, now - last_refill)
        tokens = math.min(burst, tokens + time_passed * refill_rate)
        
        local allowed = 0
        local retry_after = 0
        
        if tokens >= 1 then
            tokens = tokens - 1
            allowed = 1
        else
            if refill_rate > 0 then
                retry_after = math.ceil((1 - tokens) / refill_rate)
            else
                retry_after = 60 -- Default fallback
            end
        end
        
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        -- Expire the key when bucket would be full anyway
        local time_to_full = 0
        if refill_rate > 0 then
            time_to_full = math.ceil((burst - tokens) / refill_rate)
        end
        redis.call('EXPIRE', key, math.max(60, time_to_full + 5))
        
        return {allowed, tokens, retry_after, time_to_full}
        """

    def _get_client(self):
        if self._client is not None:
            return self._client
        import redis

        uri = settings.RATE_LIMIT_STORAGE_URI.strip() or settings.REDIS_URL
        self._client = redis.from_url(uri, decode_responses=True)
        return self._client

    def _load_script(self, client):
        if not self._script_sha:
            self._script_sha = client.script_load(self._lua_script)
        return self._script_sha

    def is_allowed(
        self, key: str, max_requests: int, window_seconds: int, burst: int
    ) -> Tuple[bool, int, int, int]:
        client = self._get_client()
        script_sha = self._load_script(client)
        now = time.time()
        refill_rate = max_requests / window_seconds
        
        try:
            res = client.evalsha(script_sha, 1, key, burst, refill_rate, now)
        except Exception:
            # Script might have been flushed from Redis cache, reload and try again
            self._script_sha = client.script_load(self._lua_script)
            res = client.evalsha(self._script_sha, 1, key, burst, refill_rate, now)

        allowed = bool(res[0])
        tokens_remaining = float(res[1])
        retry_after = max(1, int(res[2]))
        time_to_full = max(1, int(res[3]))
        
        if allowed:
            return True, burst, int(tokens_remaining), time_to_full
        else:
            return False, burst, 0, retry_after


class TierRateLimiter:
    """
    Main rate limiting engine coordinating Redis/In-Memory stores,
    tier detection, bypass rules, and response headers.
    """

    def __init__(self):
        self._in_memory = InMemorySlidingWindowStore()
        self._in_memory_tb = InMemoryTokenBucketStore()
        self._redis_store: Optional[RedisSlidingWindowStore] = None
        self._use_redis = bool(
            settings.RATE_LIMIT_STORAGE_URI.strip() or settings.REDIS_URL
        )

    def _get_redis_store(self) -> Optional[RedisSlidingWindowStore]:
        if not self._use_redis:
            return None
        if self._redis_store is None:
            try:
                self._redis_store = RedisSlidingWindowStore()
            except Exception as e:
                logger.warning("Failed to initialize Redis store for rate limiting: %s", e)
                return None
        return self._redis_store

    def resolve_tier(self, request: Request) -> Tuple[RateLimitTier, str]:
        """
        Determines the client tier and unique subject identifier.
        """
        # 1. Check bypass key / token
        bypass_token = settings.RATE_LIMIT_BYPASS_TOKEN.strip()
        header_key = request.headers.get("X-Internal-Service-Key") or request.headers.get(
            "X-RateLimit-Bypass"
        )
        if bypass_token and header_key and header_key == bypass_token:
            return RateLimitTier.BYPASS, "internal_service"

        # 2. Check bypass IPs
        ip = client_address(request)
        if ip in settings.rate_limit_bypass_ip_list:
            return RateLimitTier.BYPASS, ip

        # 3. Check authentication from request state or Authorization header
        user = getattr(request.state, "user", None)
        if user is not None:
            user_id = str(getattr(user, "id", getattr(user, "user_id", "auth_user")))
            role = str(getattr(user, "role", "user")).lower()
            if role in ("admin", "superuser"):
                return RateLimitTier.ADMIN, f"user:{user_id}"
            if getattr(user, "is_premium", False) or role == "premium":
                return RateLimitTier.PREMIUM, f"user:{user_id}"
            return RateLimitTier.AUTHENTICATED, f"user:{user_id}"

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            try:
                import jwt

                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=[settings.JWT_ALGORITHM],
                    options={"verify_signature": False},
                )
                user_id = str(payload.get("sub") or payload.get("user_id") or "token_user")
                role = str(payload.get("role", "")).lower()
                if role in ("admin", "superuser"):
                    return RateLimitTier.ADMIN, f"user:{user_id}"
                if payload.get("is_premium") or role == "premium":
                    return RateLimitTier.PREMIUM, f"user:{user_id}"
                return RateLimitTier.AUTHENTICATED, f"user:{user_id}"
            except Exception:
                pass

        return RateLimitTier.ANONYMOUS, f"ip:{ip}"

    def get_tier_limit(
        self,
        tier: RateLimitTier,
        custom_limits: Optional[Dict[RateLimitTier, str]] = None,
    ) -> Tuple[int, int, int]:
        """
        Resolves rate limit for a given tier.
        """
        if custom_limits and tier in custom_limits:
            limit_str = custom_limits[tier]
        else:
            if tier == RateLimitTier.ADMIN:
                limit_str = settings.RATE_LIMIT_ADMIN
            elif tier == RateLimitTier.PREMIUM:
                limit_str = settings.RATE_LIMIT_PREMIUM
            elif tier == RateLimitTier.AUTHENTICATED:
                limit_str = settings.RATE_LIMIT_AUTHENTICATED
            else:
                limit_str = settings.RATE_LIMIT_ANONYMOUS

        # In testing without force flag, disable by inflating limit
        if is_testing and not force_rate_limits:
            limit_str = "1000000/minute"

        return parse_rate_limit_string(limit_str)

    def check_rate_limit(
        self,
        request: Request,
        endpoint_name: str = "global",
        custom_limits: Optional[Dict[RateLimitTier, str]] = None,
    ) -> RateLimitResult:
        if not settings.ENABLE_RATE_LIMIT:
            return RateLimitResult(
                allowed=True,
                limit=1000000,
                remaining=1000000,
                reset_seconds=0,
                retry_after=0,
                tier=RateLimitTier.BYPASS.value,
            )

        tier, subject_id = self.resolve_tier(request)

        if tier == RateLimitTier.BYPASS:
            return RateLimitResult(
                allowed=True,
                limit=1000000,
                remaining=1000000,
                reset_seconds=0,
                retry_after=0,
                tier=RateLimitTier.BYPASS.value,
            )

        max_requests, window_seconds, burst = self.get_tier_limit(tier, custom_limits)
        key = f"rate_limit:{endpoint_name}:{tier.value}:{subject_id}"
        
        is_token_bucket = burst != max_requests

        # Try Redis first, fall back to in-memory on error
        redis_store = self._get_redis_store()
        if redis_store:
            try:
                if is_token_bucket:
                    # Use RedisTokenBucketStore logic. For simplicity we can instantiate it on the fly 
                    # or just reuse the redis client
                    tb_store = RedisTokenBucketStore(redis_client=redis_store._get_client())
                    allowed, limit, remaining, reset_secs = tb_store.is_allowed(
                        key, max_requests, window_seconds, burst
                    )
                else:
                    allowed, limit, remaining, reset_secs = redis_store.is_allowed(
                        key, max_requests, window_seconds
                    )
                return RateLimitResult(
                    allowed=allowed,
                    limit=limit,
                    remaining=remaining,
                    reset_seconds=reset_secs,
                    retry_after=reset_secs if not allowed else 0,
                    tier=tier.value,
                )
            except Exception as e:
                logger.debug("Redis rate limit check failed (%s); falling back to in-memory.", e)

        if is_token_bucket:
            allowed, limit, remaining, reset_secs = self._in_memory_tb.is_allowed(
                key, max_requests, window_seconds, burst
            )
        else:
            allowed, limit, remaining, reset_secs = self._in_memory.is_allowed(
                key, max_requests, window_seconds
            )
            
        return RateLimitResult(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_seconds=reset_secs,
            retry_after=reset_secs if not allowed else 0,
            tier=tier.value,
        )


# Global rate limiter instance
tier_rate_limiter = TierRateLimiter()


def attach_rate_limit_headers(response: Response, result: RateLimitResult) -> None:
    """Attaches standard X-RateLimit headers and Retry-After if rate limited."""
    response.headers["X-RateLimit-Limit"] = str(result.limit)
    response.headers["X-RateLimit-Remaining"] = str(result.remaining)
    response.headers["X-RateLimit-Reset"] = str(result.reset_seconds)
    response.headers["X-RateLimit-Tier"] = result.tier
    if not result.allowed and result.retry_after > 0:
        response.headers["Retry-After"] = str(result.retry_after)


def rate_limit_tier(
    anonymous: Optional[str] = None,
    authenticated: Optional[str] = None,
    premium: Optional[str] = None,
    admin: Optional[str] = None,
    name: Optional[str] = None,
):
    """
    Route decorator for fine-grained per-endpoint rate limits across user tiers.
    """
    custom_limits: Dict[RateLimitTier, str] = {}
    if anonymous:
        custom_limits[RateLimitTier.ANONYMOUS] = anonymous
    if authenticated:
        custom_limits[RateLimitTier.AUTHENTICATED] = authenticated
    if premium:
        custom_limits[RateLimitTier.PREMIUM] = premium
    if admin:
        custom_limits[RateLimitTier.ADMIN] = admin

    def decorator(func: Callable):
        endpoint_name = name or func.__name__

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            request: Optional[Request] = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get("request")

            result: Optional[RateLimitResult] = None
            if request is not None:
                result = tier_rate_limiter.check_rate_limit(
                    request, endpoint_name, custom_limits
                )
                if not result.allowed:
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "success": False,
                            "detail": f"Rate limit exceeded. Try again in {result.retry_after} seconds.",
                            "error_code": "RATE_LIMIT_EXCEEDED",
                            "retry_after_seconds": result.retry_after,
                            "limit": result.limit,
                            "remaining": 0,
                            "tier": result.tier,
                        },
                        headers={
                            "Retry-After": str(result.retry_after),
                            "X-RateLimit-Limit": str(result.limit),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(result.reset_seconds),
                            "X-RateLimit-Tier": result.tier,
                        },
                    )

            response = await func(*args, **kwargs)
            if request is not None and result is not None:
                if not isinstance(response, Response):
                    response = JSONResponse(content=response)
                attach_rate_limit_headers(response, result)
            return response

        return async_wrapper

    return decorator


class TierRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Global middleware enforcing tier-based rate limiting across all incoming requests.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Exclude static assets, health checks, docs from global limiter
        path = request.url.path
        if (
            path.startswith("/docs")
            or path.startswith("/redoc")
            or path.startswith("/openapi.json")
            or path.startswith("/static")
            or path in ("/health", "/api/v1/health", "/favicon.ico")
        ):
            return await call_next(request)

        result = tier_rate_limiter.check_rate_limit(request, endpoint_name="api_global")

        if not result.allowed:
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "detail": f"Rate limit exceeded. Try again in {result.retry_after} seconds.",
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "retry_after_seconds": result.retry_after,
                    "limit": result.limit,
                    "remaining": 0,
                    "tier": result.tier,
                },
            )
            attach_rate_limit_headers(response, result)
            return response

        response = await call_next(request)
        attach_rate_limit_headers(response, result)
        return response
