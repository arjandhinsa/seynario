import hashlib
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.config import settings
from app.database import get_db
from app.models.wardrobe import Garment
from app.middleware.auth import get_current_user
from app.services.image_store import upload_image, delete_image
from app.services.quota import check_and_increment
from app.services.validation import validate_and_prepare_image
from app.services.vision import identify_garment


logger = logging.getLogger("seynario.wardrobe")

router = APIRouter()


# --- Schemas ---

class GarmentResponse(BaseModel):
    id: str
    image_url: str
    category: str
    subcategory: str | None
    colour: str | None
    pattern: str | None
    material: str | None
    season: str | None
    formality: int | None
    ai_description: str | None

class GarmentUpdateRequest(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    colour: str | None = None
    pattern: str | None = None
    material: str | None = None
    season: str | None = None
    formality: int | None = None


def _garment_response(g: Garment) -> GarmentResponse:
    return GarmentResponse(
        id=g.id, image_url=g.image_url, category=g.category,
        subcategory=g.subcategory, colour=g.colour, pattern=g.pattern,
        material=g.material, season=g.season, formality=g.formality,
        ai_description=g.ai_description,
    )


# --- Endpoints ---

@router.post("/scan", response_model=GarmentResponse, status_code=201)
async def scan_garment(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Read at most MAX+1 bytes so an oversized body is rejected without
    # buffering the whole thing in memory.
    raw_bytes = await file.read(settings.MAX_UPLOAD_BYTES + 1)

    # Validate (size, MIME allowlist, real content via Pillow, dimensions)
    # and normalise to a downscaled JPEG. Raises 400/413/415 on failure.
    # Also replaces the old convert_to_jpeg — HEIC comes out as JPEG here.
    image_bytes = validate_and_prepare_image(raw_bytes, file.content_type)

    # Dedup: identical re-upload by the same user returns the cached scan
    # without touching the model, Cloudinary, or the quota.
    image_hash = hashlib.sha256(raw_bytes).hexdigest()
    result = await db.execute(
        select(Garment).where(
            Garment.user_id == user_id, Garment.image_hash == image_hash
        )
    )
    existing = result.scalars().first()
    if existing:
        return JSONResponse(
            status_code=200, content=_garment_response(existing).model_dump()
        )

    # Quota check + increment happens BEFORE any spend (model or storage).
    # Raises 429 (user daily cap) or 503 (global budget exhausted).
    await check_and_increment(db, user_id, "scan")

    # Send to GPT-4o vision to identify.
    try:
        ai_result = await identify_garment(image_bytes)
    except Exception:
        # If AI fails, still save with the image but no attributes
        logger.exception("Vision call failed for user %s", user_id)
        ai_result = {"category": "top", "description": "Could not identify — please edit manually"}

    # Upload to Cloudinary only once we're keeping the garment.
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}"
    image_url = upload_image(image_bytes, filename)

    # Save to database
    garment = Garment(
        user_id=user_id,
        image_url=image_url,
        image_hash=image_hash,
        category=ai_result.get("category", "top"),
        subcategory=ai_result.get("subcategory"),
        colour=ai_result.get("colour"),
        pattern=ai_result.get("pattern"),
        material=ai_result.get("material"),
        season=ai_result.get("season"),
        formality=ai_result.get("formality"),
        ai_description=ai_result.get("description"),
    )
    db.add(garment)
    await db.commit()
    await db.refresh(garment)

    return _garment_response(garment)


@router.get("/", response_model=list[GarmentResponse])
async def list_garments(
    category: str | None = Query(None),
    season: str | None = Query(None),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Garment).where(
        Garment.user_id == user_id
    ).order_by(Garment.created_at.desc())

    if category:
        query = query.where(Garment.category == category)
    if season:
        query = query.where(Garment.season == season)

    result = await db.execute(query)
    garments = result.scalars().all()

    return [_garment_response(g) for g in garments]


@router.put("/{garment_id}", response_model=GarmentResponse)
async def update_garment(
    garment_id: str,
    body: GarmentUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Garment).where(Garment.id == garment_id, Garment.user_id == user_id)
    )
    garment = result.scalar_one_or_none()
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")

    # Update only the fields that were provided
    if body.category is not None:
        garment.category = body.category
    if body.subcategory is not None:
        garment.subcategory = body.subcategory
    if body.colour is not None:
        garment.colour = body.colour
    if body.pattern is not None:
        garment.pattern = body.pattern
    if body.material is not None:
        garment.material = body.material
    if body.season is not None:
        garment.season = body.season
    if body.formality is not None:
        garment.formality = body.formality

    await db.commit()
    await db.refresh(garment)

    return _garment_response(garment)


@router.delete("/{garment_id}", status_code=204)
async def delete_garment(
    garment_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Garment).where(Garment.id == garment_id, Garment.user_id == user_id)
    )
    garment = result.scalar_one_or_none()
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")

    # Delete from Cloudinary; log if the asset couldn't be confirmed gone.
    if not delete_image(garment.image_url):
        logger.warning("Cloudinary asset not confirmed deleted: %s", garment.image_url)

    # Delete from database
    await db.delete(garment)
    await db.commit()
