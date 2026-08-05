"""Upload validation: oversized, wrong MIME, corrupt content, downscale, dedup."""

import io

import pytest
from fastapi import HTTPException
from PIL import Image

import app.routes.wardrobe as wardrobe_route
from app.config import settings
from app.services.validation import validate_and_prepare_image
from tests.conftest import bearer


def image_bytes(fmt="PNG", size=(120, 90)):
    img = Image.new("RGB", size, (180, 60, 60))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# --- Unit level ---

def test_oversized_rejected_413():
    blob = b"x" * (settings.MAX_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as e:
        validate_and_prepare_image(blob, "image/jpeg")
    assert e.value.status_code == 413


def test_disallowed_mime_rejected_415():
    with pytest.raises(HTTPException) as e:
        validate_and_prepare_image(image_bytes("PNG"), "text/plain")
    assert e.value.status_code == 415


def test_corrupt_content_rejected_400():
    with pytest.raises(HTTPException) as e:
        validate_and_prepare_image(b"this is not an image at all", "image/jpeg")
    assert e.value.status_code == 400


def test_real_gif_disguised_as_jpeg_rejected_415():
    # Valid image bytes, but a format we don't allow — declared type lies.
    with pytest.raises(HTTPException) as e:
        validate_and_prepare_image(image_bytes("GIF"), "image/jpeg")
    assert e.value.status_code == 415


def test_valid_png_normalised_to_jpeg():
    out = validate_and_prepare_image(image_bytes("PNG"), "image/png")
    assert out[:2] == b"\xff\xd8"  # JPEG magic bytes


def test_large_image_downscaled():
    big = image_bytes("JPEG", size=(4000, 500))
    out = validate_and_prepare_image(big, "image/jpeg")
    img = Image.open(io.BytesIO(out))
    assert max(img.size) <= settings.MAX_IMAGE_DIMENSION


# --- Endpoint level: dedup ---

async def test_duplicate_scan_returns_cached_result(client, auth_token, monkeypatch):
    calls = {"vision": 0}

    async def fake_identify(image):
        calls["vision"] += 1
        return {"category": "top", "colour": "black", "description": "a black tee"}

    monkeypatch.setattr(wardrobe_route, "identify_garment", fake_identify)
    monkeypatch.setattr(
        wardrobe_route, "upload_image",
        lambda b, f: "https://res.cloudinary.com/test/image/upload/v1/seynario/x.jpg",
    )

    photo = image_bytes("JPEG")
    first = await client.post(
        "/api/wardrobe/scan", headers=bearer(auth_token),
        files={"file": ("a.jpg", photo, "image/jpeg")},
    )
    assert first.status_code == 201, first.text

    second = await client.post(
        "/api/wardrobe/scan", headers=bearer(auth_token),
        files={"file": ("a.jpg", photo, "image/jpeg")},
    )
    assert second.status_code == 200  # cached, not re-created
    assert second.json()["id"] == first.json()["id"]
    assert calls["vision"] == 1  # the model was only called once

    listing = await client.get("/api/wardrobe/", headers=bearer(auth_token))
    assert len(listing.json()) == 1
