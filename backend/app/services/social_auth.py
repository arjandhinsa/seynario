"""One-tap auth token verification: Google and Apple.

Both providers hand the frontend a signed identity token; we verify it
server-side and extract a stable subject id + verified email. Accounts
link by verified email — an existing email/password user who taps
Google with the same address gets linked, not duplicated.

Configuration (all optional — endpoints 501 until set):
    GOOGLE_CLIENT_ID  — OAuth client id from Google Cloud console
    APPLE_CLIENT_ID   — Services ID from the Apple Developer portal
"""

import logging
import time

import httpx
from fastapi import HTTPException
from jose import jwt as jose_jwt, JWTError

from app.config import settings


logger = logging.getLogger("seynario.social_auth")

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"

_apple_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}


def verify_google_token(id_token_str: str) -> dict:
    """Verify a Google ID token. Returns {sub, email, name} or raises 401/501."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google sign-in is not configured.")

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    try:
        info = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        logger.warning("Google token rejected: %s", e)
        raise HTTPException(status_code=401, detail="Invalid Google token.")

    if not info.get("email") or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email not verified.")

    return {
        "sub": info["sub"],
        "email": info["email"].lower(),
        "name": info.get("name"),
    }


def _apple_jwks() -> dict:
    """Apple's signing keys, cached for an hour."""
    now = time.time()
    if _apple_jwks_cache["keys"] is None or now - _apple_jwks_cache["fetched_at"] > 3600:
        resp = httpx.get(APPLE_JWKS_URL, timeout=10)
        resp.raise_for_status()
        _apple_jwks_cache["keys"] = resp.json()
        _apple_jwks_cache["fetched_at"] = now
    return _apple_jwks_cache["keys"]


def verify_apple_token(identity_token: str) -> dict:
    """Verify an Apple identity token. Returns {sub, email, name} or raises 401/501.

    Note: Apple only includes the email in the token on the user's FIRST
    authorisation; later logins carry only the sub. We handle that in the
    route by matching on apple_sub first.
    """
    if not settings.APPLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Apple sign-in is not configured.")

    try:
        header = jose_jwt.get_unverified_header(identity_token)
        jwks = _apple_jwks()
        key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)
        if key is None:
            # Key rotation between cache refreshes — force refetch once.
            _apple_jwks_cache["keys"] = None
            jwks = _apple_jwks()
            key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)
        if key is None:
            raise HTTPException(status_code=401, detail="Invalid Apple token.")

        claims = jose_jwt.decode(
            identity_token, key,
            algorithms=[header.get("alg", "RS256")],
            audience=settings.APPLE_CLIENT_ID,
            issuer=APPLE_ISSUER,
        )
    except JWTError as e:
        logger.warning("Apple token rejected: %s", e)
        raise HTTPException(status_code=401, detail="Invalid Apple token.")

    email = claims.get("email")
    return {
        "sub": claims["sub"],
        "email": email.lower() if email else None,
        "name": None,  # Apple sends the name separately, first auth only
    }
