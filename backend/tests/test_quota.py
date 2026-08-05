"""Quota logic: per-user caps, daily reset, global spend ceiling."""

import pytest
from fastapi import HTTPException

import app.services.quota as quota
from app.config import settings
from app.services.quota import check_and_increment


async def test_user_daily_cap_enforced(db, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_SCAN_LIMIT", 3)

    for _ in range(3):
        await check_and_increment(db, "user-1", "scan")

    with pytest.raises(HTTPException) as e:
        await check_and_increment(db, "user-1", "scan")
    assert e.value.status_code == 429
    assert "Retry-After" in e.value.headers


async def test_caps_are_per_user(db, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_SCAN_LIMIT", 1)

    await check_and_increment(db, "user-1", "scan")
    with pytest.raises(HTTPException):
        await check_and_increment(db, "user-1", "scan")

    # A different user is unaffected.
    await check_and_increment(db, "user-2", "scan")


async def test_scan_and_recommend_counted_separately(db, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_SCAN_LIMIT", 1)
    monkeypatch.setattr(settings, "DAILY_RECOMMEND_LIMIT", 1)

    await check_and_increment(db, "user-1", "scan")
    # Scan cap reached; recommend still available.
    await check_and_increment(db, "user-1", "recommend")

    with pytest.raises(HTTPException):
        await check_and_increment(db, "user-1", "scan")


async def test_daily_reset(db, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_SCAN_LIMIT", 1)

    await check_and_increment(db, "user-1", "scan")
    with pytest.raises(HTTPException):
        await check_and_increment(db, "user-1", "scan")

    # Next UTC day: counter starts fresh.
    monkeypatch.setattr(quota, "_utc_today", lambda: "2099-01-01")
    await check_and_increment(db, "user-1", "scan")


async def test_global_spend_ceiling(db, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_SCAN_LIMIT", 100)
    monkeypatch.setattr(settings, "GLOBAL_DAILY_AI_CALL_BUDGET", 3)

    await check_and_increment(db, "user-1", "scan")
    await check_and_increment(db, "user-2", "scan")
    await check_and_increment(db, "user-3", "recommend")

    # Budget exhausted — even a brand-new user is refused.
    with pytest.raises(HTTPException) as e:
        await check_and_increment(db, "user-4", "scan")
    assert e.value.status_code == 503
