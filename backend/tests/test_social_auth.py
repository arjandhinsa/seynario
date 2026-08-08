"""One-tap auth: token verification is mocked; what we test is the
find-or-create-or-link logic and the unconfigured-provider guard."""

from sqlalchemy import select

import app.routes.auth as auth_route
from app.models.user import User
from tests.conftest import bearer


def _mock_google(monkeypatch, sub="g-sub-1", email="tap@example.com", name="Tap User"):
    monkeypatch.setattr(
        auth_route, "verify_google_token",
        lambda token: {"sub": sub, "email": email, "name": name},
    )


async def test_google_creates_account(client, db, monkeypatch):
    _mock_google(monkeypatch)
    resp = await client.post("/api/auth/google", json={"token": "fake"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["access_token"]

    result = await db.execute(select(User).where(User.email == "tap@example.com"))
    user = result.scalar_one()
    assert user.auth_provider == "google"
    assert user.google_sub == "g-sub-1"


async def test_google_links_existing_email_account(client, db, monkeypatch):
    # Existing email/password account…
    reg = await client.post("/api/auth/register", json={
        "email": "link@example.com", "password": "password123",
    })
    assert reg.status_code == 201

    # …then the same person taps Google.
    _mock_google(monkeypatch, sub="g-sub-2", email="link@example.com")
    resp = await client.post("/api/auth/google", json={"token": "fake"})
    assert resp.status_code == 200

    # Linked, not duplicated.
    result = await db.execute(select(User).where(User.email == "link@example.com"))
    users = result.scalars().all()
    assert len(users) == 1
    assert users[0].google_sub == "g-sub-2"
    assert users[0].auth_provider != "google"  # created via password, stays that way

    # Both auth methods now work: password login still fine.
    login = await client.post("/api/auth/login", json={
        "email": "link@example.com", "password": "password123",
    })
    assert login.status_code == 200


async def test_google_returning_user_logs_in(client, db, monkeypatch):
    _mock_google(monkeypatch, sub="g-sub-3", email="ret@example.com")
    first = await client.post("/api/auth/google", json={"token": "fake"})
    second = await client.post("/api/auth/google", json={"token": "fake"})
    assert first.status_code == second.status_code == 200

    result = await db.execute(select(User).where(User.email == "ret@example.com"))
    assert len(result.scalars().all()) == 1  # no duplicate

    # And the token works against a protected route.
    me = await client.get(
        "/api/auth/me", headers=bearer(second.json()["access_token"])
    )
    assert me.json()["email"] == "ret@example.com"


async def test_unconfigured_provider_returns_501(client):
    # No GOOGLE_CLIENT_ID in test env → real verifier refuses politely.
    resp = await client.post("/api/auth/google", json={"token": "anything"})
    assert resp.status_code == 501
