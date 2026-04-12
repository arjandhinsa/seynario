import uuid

import io
from PIL import Image
import pillow_heif

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.wardrobe import Garment
from app.middleware.auth import get_current_user
from app.services.image_store import upload_image, delete_image
from app.services.vision import identify_garment


def convert_to_jpeg(image_bytes: bytes, content_type: str) -> bytes:
    """Convert HEIC/HEIF to JPEG. Pass through JPG/PNG unchanged."""
    if content_type in ("image/heic", "image/heif") or image_bytes[:4] == b'\x00\x00\x00\x18':
        # Register HEIF support with Pillow
        pillow_heif.register_heif_opener()
        img = Image.open(io.BytesIO(image_bytes))
        output = io.BytesIO()
        img.convert("RGB").save(output, format="JPEG", quality=85)
        return output.getvalue()
    return image_bytes


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


# --- Endpoints ---

@router.post("/scan", response_model=GarmentResponse, status_code=201)
async def scan_garment(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Read and convert image (handles HEIC from iPhones)
    raw_bytes = await file.read()
    image_bytes = convert_to_jpeg(raw_bytes, file.content_type)

    # Upload to Cloudinary
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}"
    image_url = upload_image(image_bytes, filename)

    # Send to GPT-4o vision to identify
    try:
        ai_result = await identify_garment(image_bytes)
    except Exception as e:
        # If AI fails, still save with the image but no attributes
        ai_result = {"category": "top", "description": "Could not identify — please edit manually"}

    # Save to database
    garment = Garment(
        user_id=user_id,
        image_url=image_url,
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

    return GarmentResponse(
        id=garment.id,
        image_url=garment.image_url,
        category=garment.category,
        subcategory=garment.subcategory,
        colour=garment.colour,
        pattern=garment.pattern,
        material=garment.material,
        season=garment.season,
        formality=garment.formality,
        ai_description=garment.ai_description,
    )


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

    return [
        GarmentResponse(
            id=g.id, image_url=g.image_url, category=g.category,
            subcategory=g.subcategory, colour=g.colour, pattern=g.pattern,
            material=g.material, season=g.season, formality=g.formality,
            ai_description=g.ai_description,
        )
        for g in garments
    ]


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
    if body.category is not None: garment.category = body.category
    if body.subcategory is not None: garment.subcategory = body.subcategory
    if body.colour is not None: garment.colour = body.colour
    if body.pattern is not None: garment.pattern = body.pattern
    if body.material is not None: garment.material = body.material
    if body.season is not None: garment.season = body.season
    if body.formality is not None: garment.formality = body.formality

    await db.commit()
    await db.refresh(garment)

    return GarmentResponse(
        id=garment.id, image_url=garment.image_url, category=garment.category,
        subcategory=garment.subcategory, colour=garment.colour, pattern=garment.pattern,
        material=garment.material, season=garment.season, formality=garment.formality,
        ai_description=garment.ai_description,
    )


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

    # Delete from Cloudinary
    delete_image(garment.image_url)

    # Delete from database
    await db.delete(garment)
    await db.commit()