"""Per-user daily quotas and the app-wide daily spend ceiling.

Counters live in the usage_counters table, keyed by (scope, UTC date),
where scope is a user id or the GLOBAL_SCOPE sentinel. Counts are
incremented *before* the OpenAI call so attempts are bounded even if
the call fails midway.

check_and_increment() is the single entry point: it raises 429 when the
user's daily cap is hit (with the reset time in the message), 503 when
the app-wide budget is exhausted, and otherwise increments both
counters and logs the running daily totals so cost is observable from
the logs.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.usage import GLOBAL_SCOPE, UsageCounter


logger = logging.getLogger("seynario.usage")

_KIND_FIELDS = {"scan": "scan_count", "recommend": "recommend_count"}


def _limit_for(kind: str) -> int:
    return {
        "scan": settings.DAILY_SCAN_LIMIT,
        "recommend": settings.DAILY_RECOMMEND_LIMIT,
    }[kind]


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _next_utc_midnight() -> datetime:
    now = datetime.now(timezone.utc)
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def _retry_after_seconds() -> int:
    return max(1, int((_next_utc_midnight() - datetime.now(timezone.utc)).total_seconds()))


async def _get_or_create(db: AsyncSession, scope: str, date: str) -> UsageCounter:
    result = await db.execute(
        select(UsageCounter).where(UsageCounter.scope == scope, UsageCounter.date == date)
    )
    counter = result.scalar_one_or_none()
    if counter is None:
        counter = UsageCounter(scope=scope, date=date, scan_count=0, recommend_count=0)
        db.add(counter)
        try:
            await db.flush()
        except Exception:
            # Concurrent insert hit the unique constraint — re-read.
            await db.rollback()
            result = await db.execute(
                select(UsageCounter).where(
                    UsageCounter.scope == scope, UsageCounter.date == date
                )
            )
            counter = result.scalar_one()
    return counter


async def check_and_increment(db: AsyncSession, user_id: str, kind: str) -> None:
    """Enforce quotas for one AI call of the given kind ("scan"/"recommend").

    Raises HTTPException 429 (per-user cap) or 503 (global budget).
    On success both counters are incremented and flushed; the caller's
    eventual commit persists them alongside the work itself.
    """
    field = _KIND_FIELDS[kind]
    limit = _limit_for(kind)
    today = _utc_today()

    # Global spend ceiling first — protects the app as a whole.
    global_counter = await _get_or_create(db, GLOBAL_SCOPE, today)
    total_calls = global_counter.scan_count + global_counter.recommend_count
    if total_calls >= settings.GLOBAL_DAILY_AI_CALL_BUDGET:
        logger.warning(
            "Global daily AI budget exhausted (%s calls on %s) — refusing %s for user %s",
            total_calls, today, kind, user_id,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "We've hit our daily AI budget, so scanning and recommendations "
                "are paused until midnight UTC. Your wardrobe is safe — please "
                "try again tomorrow."
            ),
            headers={"Retry-After": str(_retry_after_seconds())},
        )

    # Then the per-user daily cap.
    user_counter = await _get_or_create(db, user_id, today)
    used = getattr(user_counter, field)
    if used >= limit:
        reset = _next_utc_midnight()
        raise HTTPException(
            status_code=429,
            detail=(
                f"Daily {kind} limit reached ({limit}/day on the free tier). "
                f"Resets at {reset.strftime('%H:%M UTC on %d %b %Y')}."
            ),
            headers={"Retry-After": str(_retry_after_seconds())},
        )

    setattr(user_counter, field, used + 1)
    setattr(global_counter, field, getattr(global_counter, field) + 1)
    await db.flush()

    logger.info(
        "usage kind=%s user=%s user_count=%d/%d global_calls=%d/%d date=%s",
        kind, user_id, used + 1, limit,
        total_calls + 1, settings.GLOBAL_DAILY_AI_CALL_BUDGET, today,
    )
