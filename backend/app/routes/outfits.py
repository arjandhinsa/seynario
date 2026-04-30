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
    annotation: str | None
    affiliate_url: str | None
    affiliate_image: str | None
    affiliate_price: str | None

class OutfitResponse(BaseModel):
    id: str
    name: str | None
    rationale: str | None
    sticky_note: str | None
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


# --- Helpers ---

def _brief_garment_caption(garment) -> str | None:
    """Short polaroid caption for an owned garment.
    Prefers `colour subcategory`; falls through to subcategory alone, then
    to a 30-char-truncated ai_description, then None. Mirrors the brevity
    of LibraryGarment.name so the production OutfitDetail polaroids read
    like the demo's, instead of dumping a full sentence into the caption.
    """
    if garment is None:
        return None
    colour = (garment.colour or "").strip()
    sub = (garment.subcategory or "").strip()
    if colour and sub:
        return f"{colour} {sub}"
    if sub:
        return sub
    desc = (garment.ai_description or "").strip()
    if not desc:
        return None
    return desc[:30].rstrip() + ("…" if len(desc) > 30 else "")


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

    if not user.gender or not user.body_type or not user.style_pref:
        raise HTTPException(
            status_code=400,
            detail="Please complete your style profile before generating outfits"
        )

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
        sticky_raw = outfit_data.get("sticky_note")
        if isinstance(sticky_raw, str) and not sticky_raw.strip():
            sticky_raw = None

        outfit = Outfit(
            user_id=user_id,
            scenario_id=scenario.id,
            name=outfit_data.get("name"),
            rationale=outfit_data.get("rationale"),
            sticky_note=sticky_raw,
        )
        db.add(outfit)
        await db.flush()

        for item_data in outfit_data.get("items", []):
            garment_id = item_data.get("garment_id")
            is_owned = garment_id is not None and garment_id in garment_lookup

            buy_desc = item_data.get("buy_description") if not is_owned else None
            annotation = item_data.get("annotation")
            if isinstance(annotation, str) and not annotation.strip():
                annotation = None

            item = OutfitItem(
                outfit_id=outfit.id,
                garment_id=garment_id if is_owned else None,
                position=item_data.get("position", "top"),
                is_owned=is_owned,
                annotation=annotation,
                affiliate_name=buy_desc,
                affiliate_url=f"https://www.amazon.co.uk/s?k={buy_desc.replace(' ', '+')}&i=clothing&tag=seynario-21" if buy_desc else None,
                affiliate_image=None,  # Placeholder until we can fetch real images
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
            sticky_note=outfit.sticky_note,
            scenario_id=outfit.scenario_id,
            is_saved=outfit.is_saved,
            items=[
                OutfitItemResponse(
                    id=item.id,
                    position=item.position,
                    is_owned=item.is_owned,
                    garment_id=item.garment_id,
                    image_url=garment_lookup[item.garment_id].image_url if item.garment_id and item.garment_id in garment_lookup else None,
                    name=item.affiliate_name or _brief_garment_caption(
                        garment_lookup.get(item.garment_id) if item.garment_id else None
                    ),
                    annotation=item.annotation,
                    affiliate_url=item.affiliate_url,
                    affiliate_image=item.affiliate_image,
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


@router.get("/{outfit_id}", response_model=OutfitResponse)
async def get_outfit(
    outfit_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Single outfit with items, rationale, sticky note, and per-item
    annotations. Powers the authed OutfitDetail flat-lay + why-this-works
    + stockists view."""
    result = await db.execute(
        select(Outfit)
        .where(Outfit.id == outfit_id, Outfit.user_id == user_id)
        .options(selectinload(Outfit.items))
    )
    outfit = result.scalar_one_or_none()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    # Build a lookup for owned garments so we can hydrate image_url + name.
    owned_ids = [i.garment_id for i in outfit.items if i.garment_id]
    garment_lookup = {}
    if owned_ids:
        garment_result = await db.execute(
            select(Garment).where(Garment.id.in_(owned_ids))
        )
        garment_lookup = {g.id: g for g in garment_result.scalars().all()}

    return OutfitResponse(
        id=outfit.id,
        name=outfit.name,
        rationale=outfit.rationale,
        sticky_note=outfit.sticky_note,
        scenario_id=outfit.scenario_id,
        is_saved=outfit.is_saved,
        items=[
            OutfitItemResponse(
                id=item.id,
                position=item.position,
                is_owned=item.is_owned,
                garment_id=item.garment_id,
                image_url=(
                    garment_lookup[item.garment_id].image_url
                    if item.garment_id and item.garment_id in garment_lookup
                    else None
                ),
                name=item.affiliate_name or _brief_garment_caption(
                    garment_lookup.get(item.garment_id) if item.garment_id else None
                ),
                annotation=item.annotation,
                affiliate_url=item.affiliate_url,
                affiliate_image=item.affiliate_image,
                affiliate_price=item.affiliate_price,
            )
            for item in outfit.items
        ],
    )


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