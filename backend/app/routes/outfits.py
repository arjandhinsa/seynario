import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models.wardrobe import Garment
from app.models.outfit import Outfit, OutfitItem
from app.models.scenario import Scenario
from app.models.user import User
from app.middleware.auth import get_current_user
from app.services.stylist import generate_outfits


router = APIRouter()


# --- Schemas ---

class RecommendRequest(BaseModel):
    scenario_id: str
    num_outfits: int = 3

class OutfitItemResponse(BaseModel):
    id: str
    position: str
    is_owned: bool
    garment_id: str | None
    image_url: str | None
    name: str | None
    affiliate_url: str | None
    affiliate_price: str | None

class OutfitResponse(BaseModel):
    id: str
    name: str | None
    rationale: str | None
    scenario_id: str | None
    is_saved: bool
    items: list[OutfitItemResponse]

class OutfitListResponse(BaseModel):
    id: str
    name: str | None
    scenario_id: str | None
    is_saved: bool
    created_at: str
    item_count: int


# --- Endpoints ---

@router.post("/recommend", response_model=list[OutfitResponse], status_code=201)
async def recommend_outfits(
    body: RecommendRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Load scenario
    result = await db.execute(select(Scenario).where(Scenario.id == body.scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Load user's wardrobe
    result = await db.execute(
        select(Garment).where(Garment.user_id == user_id)
    )
    garments = result.scalars().all()

    # Build data for the stylist
    wardrobe_data = [
        {
            "id": g.id, "category": g.category, "subcategory": g.subcategory,
            "colour": g.colour, "pattern": g.pattern, "material": g.material,
            "season": g.season, "formality": g.formality,
        }
        for g in garments
    ]

    scenario_data = {
        "name": scenario.name, "description": scenario.description,
        "formality_min": scenario.formality_min, "formality_max": scenario.formality_max,
        "style_notes": scenario.style_notes,
    }

    # Load user profile
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    user_profile = {
        "gender": user.gender, "body_type": user.body_type,
        "style_pref": user.style_pref,
    } if user else None

    # Generate outfit recommendations
    ai_result = await generate_outfits(
        wardrobe=wardrobe_data,
        scenario=scenario_data,
        user_profile=user_profile,
        num_outfits=body.num_outfits,
    )

    # Build a garment lookup for matching IDs to images
    garment_lookup = {g.id: g for g in garments}

    # Save outfits to database
    saved_outfits = []
    for outfit_data in ai_result["outfits"]:
        outfit = Outfit(
            user_id=user_id,
            scenario_id=scenario.id,
            name=outfit_data.get("name"),
            rationale=outfit_data.get("rationale"),
        )
        db.add(outfit)
        await db.flush()

        for item_data in outfit_data.get("items", []):
            garment_id = item_data.get("garment_id")
            is_owned = garment_id is not None and garment_id in garment_lookup

            item = OutfitItem(
                outfit_id=outfit.id,
                garment_id=garment_id if is_owned else None,
                position=item_data.get("position", "top"),
                is_owned=is_owned,
                affiliate_name=item_data.get("buy_description") if not is_owned else None,
            )
            db.add(item)

        saved_outfits.append(outfit)

    await db.commit()

    # Build response
    response = []
    for outfit in saved_outfits:
        await db.refresh(outfit)
        result = await db.execute(
            select(OutfitItem).where(OutfitItem.outfit_id == outfit.id)
        )
        items = result.scalars().all()

        response.append(OutfitResponse(
            id=outfit.id,
            name=outfit.name,
            rationale=outfit.rationale,
            scenario_id=outfit.scenario_id,
            is_saved=outfit.is_saved,
            items=[
                OutfitItemResponse(
                    id=item.id,
                    position=item.position,
                    is_owned=item.is_owned,
                    garment_id=item.garment_id,
                    image_url=garment_lookup[item.garment_id].image_url if item.garment_id and item.garment_id in garment_lookup else None,
                    name=item.affiliate_name or (garment_lookup[item.garment_id].ai_description if item.garment_id and item.garment_id in garment_lookup else None),
                    affiliate_url=item.affiliate_url,
                    affiliate_price=item.affiliate_price,
                )
                for item in items
            ],
        ))

    return response


@router.get("/", response_model=list[OutfitListResponse])
async def list_outfits(
    saved: bool | None = None,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Outfit).where(
        Outfit.user_id == user_id
    ).options(selectinload(Outfit.items)).order_by(Outfit.created_at.desc())

    if saved is not None:
        query = query.where(Outfit.is_saved == saved)

    result = await db.execute(query)
    outfits = result.scalars().all()

    return [
        OutfitListResponse(
            id=o.id, name=o.name, scenario_id=o.scenario_id,
            is_saved=o.is_saved, created_at=o.created_at.isoformat(),
            item_count=len(o.items),
        )
        for o in outfits
    ]


@router.post("/{outfit_id}/save", status_code=200)
async def save_outfit(
    outfit_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Outfit).where(Outfit.id == outfit_id, Outfit.user_id == user_id)
    )
    outfit = result.scalar_one_or_none()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    outfit.is_saved = True
    await db.commit()
    return {"status": "saved"}


@router.delete("/{outfit_id}/save", status_code=204)
async def unsave_outfit(
    outfit_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Outfit).where(Outfit.id == outfit_id, Outfit.user_id == user_id)
    )
    outfit = result.scalar_one_or_none()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    outfit.is_saved = False
    await db.commit()