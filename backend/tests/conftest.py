"""Shared test fixtures.

Env vars are set BEFORE any app import so Settings picks them up.
Tests run against a throwaway SQLite file; every test gets fresh tables.
All OpenAI and Cloudinary calls are mocked in the tests — nothing here
ever hits a live API.
"""

import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_seynario.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["APP_ENV"] = "test"
os.environ["OPENAI_API_KEY"] = "test-not-a-real-key"

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Base, SessionLocal, engine
from app.limiter import limiter

# Import every model so create_all knows the full schema.
from app.models import demo, library, outfit, product, scenario, usage, user, wardrobe

from main import app


@pytest.fixture(autouse=True)
async def _fresh_db():
    """Create all tables before each test, drop them after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def _no_rate_limits():
    """Per-IP rate limits share one bucket under the test client; disable."""
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def db():
    async with SessionLocal() as session:
        yield session


@pytest.fixture
async def auth_token(client):
    """Register a throwaway user and return their access token."""
    resp = await client.post("/api/auth/register", json={
        "email": "test@example.com", "password": "password123",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
