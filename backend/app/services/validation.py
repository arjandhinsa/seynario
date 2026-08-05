"""Upload validation for image endpoints.

Every user-supplied image passes through validate_and_prepare_image()
before anything else touches it: size cap, MIME allowlist, content
sniffing via Pillow (never trust the declared content type), dimension
cap with server-side downscale, and normalisation to JPEG so a single
known format reaches Cloudinary and the vision model.
"""

import io

from fastapi import HTTPException
from PIL import Image
import pillow_heif

from app.config import settings


# Register HEIF support once at import time (iPhone camera uploads).
pillow_heif.register_heif_opener()

# Declared content types we accept.
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",   # iPhone camera default
    "image/heif",
}

# What Pillow must actually identify the bytes as. MPO is included
# because phone cameras often produce JPEGs that Pillow identifies as
# MPO (a JPEG container with embedded extra frames, e.g. depth data).
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF", "MPO"}


def validate_and_prepare_image(raw_bytes: bytes, content_type: str | None) -> bytes:
    """Validate an uploaded image and return normalised JPEG bytes.

    Raises HTTPException 413 (too large), 415 (disallowed type), or
    400 (corrupt / not actually an image).
    """
    if len(raw_bytes) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Image too large. Maximum size is "
                f"{settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
            ),
        )
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image type. Use JPEG, PNG, WebP or HEIC.",
        )

    # Validate actual content, not the declared type or extension.
    try:
        probe = Image.open(io.BytesIO(raw_bytes))
        probe.verify()  # integrity check; leaves the object unusable
        img = Image.open(io.BytesIO(raw_bytes))  # reopen for real use
        img.load()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="File is not a valid image or is corrupted.",
        )

    if (img.format or "").upper() not in ALLOWED_PIL_FORMATS:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image type. Use JPEG, PNG, WebP or HEIC.",
        )

    # Downscale before anything is stored or sent onward.
    max_dim = settings.MAX_IMAGE_DIMENSION
    if img.width > max_dim or img.height > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    output = io.BytesIO()
    img.convert("RGB").save(output, format="JPEG", quality=85)
    return output.getvalue()
