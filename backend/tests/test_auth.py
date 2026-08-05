"""Auth: registration, login, token validation, expired-token rejection."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import settings
from app.services.auth_service import verify_token
from tests.conftest import bearer


async def test_register_returns_tokens(client):
    resp = await client.post("/api/auth/register", json={
        "email": "new@example.com", "password": "password123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["access_token"] and data["refresh_token"]
    assert data["token_type"] == "bearer"


async def test_register_duplicate_email_rejected(client):
    body = {"email": "dupe@example.com", "password": "password123"}
    assert (await client.post("/api/auth/register", json=body)).status_code == 201
    assert (await client.post("/api/auth/register", json=body)).status_code == 409


async def test_login_success_and_wrong_password(client, auth_token):
    ok = await client.post("/api/auth/login", json={
        "email": "test@example.com", "password": "password123",
    })
    assert ok.status_code == 200

    bad = await client.post("/api/auth/login", json={
        "email": "test@example.com", "password": "wrong-password",
    })
    assert bad.status_code == 401


async def test_me_requires_valid_token(client, auth_token):
    ok = await client.get("/api/auth/me", headers=bearer(auth_token))
    assert ok.status_code == 200
    assert ok.json()["email"] == "test@example.com"

    bad = await client.get("/api/auth/me", headers=bearer("garbage-token"))
    assert bad.status_code == 401


async def test_expired_token_rejected(client):
    expired = jwt.encode(
        {
            "sub": "some-user-id",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            "type": "access",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    assert verify_token(expired, expected_type="access") is None
    resp = await client.get("/api/auth/me", headers=bearer(expired))
    assert resp.status_code == 401


async def test_access_token_not_accepted_as_refresh(client, auth_token):
    resp = await client.post("/api/auth/refresh", json={"refresh_token": auth_token})
    assert resp.status_code == 401
