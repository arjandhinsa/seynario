"""
Public demo flow — three read-only endpoints, no auth.

Reads cached `DemoOutfit` rows produced by `scripts/pregenerate_demo.py`
and joins each item against `LibraryGarment` so the frontend can render
polaroids without a second roundtrip. Demo data is immutable between
pre-gen runs, so responses get a 1-hour CDN cache header.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.constants import DEMO_EXCLUDED_SCENARIOS, DEMO_WARDROBE_IDS
from app.database import get_db
from app.models.demo import DemoOutfit
from app.models.library import LibraryGarment
from app.models.scenario import Scenario


router = APIRouter()


CACHE_HEADER = "public, max-age=3600"


@router.get("/scenarios")
async def list_demo_scenarios(
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """List scenarios with at least one cached demo outfit."""
    response.headers["Cache-Control"] = CACHE_HEADER

    counts = (
        select(DemoOutfit.scenario_id, func.count(DemoOutfit.id).label("outfit_count"))
        .group_by(DemoOutfit.scenario_id)
        .subquery()
    )
    query = (
        select(Scenario, counts.c.outfit_count)
        .join(counts, Scenario.id == counts.c.scenario_id)
        .where(Scenario.name.notin_(DEMO_EXCLUDED_SCENARIOS))
        .order_by(Scenario.sort_order)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "icon": s.icon,
            "category": s.category,
            "outfit_count": int(count),
        }
        for s, count in rows
    ]


@router.get("/scenarios/{scenario_id}")
async def get_demo_scenario(
    scenario_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Cached outfits for one scenario, joined with library garment metadata."""
    response.headers["Cache-Control"] = CACHE_HEADER

    scenario_result = await db.execute(
        select(Scenario).where(Scenario.id == scenario_id)
    )
    scenario = scenario_result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    outfits_result = await db.execute(
        select(DemoOutfit)
        .where(DemoOutfit.scenario_id == scenario_id)
        .order_by(DemoOutfit.variant)
    )
    outfits = list(outfits_result.scalars().all())

    if not outfits:
        return {
            "scenario": {
                "id": scenario.id,
                "name": scenario.name,
                "description": scenario.description,
            },
            "outfits": [],
        }

    referenced_ids = {
        item["id"]
        for outfit in outfits
        for item in (outfit.items or [])
        if isinstance(item, dict) and item.get("id")
    }
    library_result = await db.execute(
        select(LibraryGarment).where(LibraryGarment.id.in_(referenced_ids))
    )
    library_by_id = {g.id: g for g in library_result.scalars().all()}

    formatted_outfits = []
    for outfit in outfits:
        items_payload = []
        for item in outfit.items or []:
            if not isinstance(item, dict):
                continue
            garment = library_by_id.get(item.get("id"))
            if garment is None:
                continue
            items_payload.append(
                {
                    "id": garment.id,
                    "position": item.get("position"),
                    "annotation": item.get("annotation"),
                    "name": garment.name,
                    "svg_path": garment.svg_path,
                    "amazon_search": garment.amazon_search,
                    "redirect_url": f"/api/r/{outfit.id}/{garment.id}",
                }
            )

        formatted_outfits.append(
            {
                "variant": outfit.variant,
                "rationale": outfit.rationale,
                "sticky_note": outfit.sticky_note,
                "items": items_payload,
            }
        )

    return {
        "scenario": {
            "id": scenario.id,
            "name": scenario.name,
            "description": scenario.description,
        },
        "outfits": formatted_outfits,
    }


@router.get("/wardrobe")
async def get_demo_wardrobe(
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """The sample wardrobe — items in DEMO_WARDROBE_IDS, in that order."""
    response.headers["Cache-Control"] = CACHE_HEADER

    result = await db.execute(
        select(LibraryGarment).where(LibraryGarment.id.in_(DEMO_WARDROBE_IDS))
    )
    by_id = {g.id: g for g in result.scalars().all()}

    return [
        {
            "id": g.id,
            "name": g.name,
            "svg_path": g.svg_path,
            "category": g.category,
            "subcategory": g.subcategory,
        }
        for slug in DEMO_WARDROBE_IDS
        if (g := by_id.get(slug)) is not None
    ]
