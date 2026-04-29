"""
Affiliate redirect for the demo flow.

The frontend never links straight to Amazon — it links here, and we 302
to the constructed Amazon UK affiliate search URL. The indirection
exists so we can record the click server-side; Amazon's affiliate cookie
alone tells us about purchases, not about which scenario/outfit/item is
generating interest.

No auth required. Module is named `redirect_route` because `redirect`
collides with the stdlib module name.
"""

from urllib.parse import quote_plus

from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.demo import DemoOutfit, DemoClick
from app.models.library import LibraryGarment


router = APIRouter()


AMAZON_BASE = "https://www.amazon.co.uk"
AMAZON_TAG = "seynario-21"


@router.get("/{outfit_id}/{item_id}")
async def redirect_to_amazon(
    outfit_id: str,
    item_id: str,
    seynario_anon: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    outfit_result = await db.execute(
        select(DemoOutfit).where(DemoOutfit.id == outfit_id)
    )
    outfit = outfit_result.scalar_one_or_none()
    if outfit is None:
        raise HTTPException(status_code=404, detail="Outfit not found")

    matched = next(
        (
            item
            for item in (outfit.items or [])
            if isinstance(item, dict) and item.get("id") == item_id
        ),
        None,
    )
    if matched is None:
        raise HTTPException(status_code=404, detail="Item not found in outfit")

    search_phrase = matched.get("search_override")
    if not search_phrase:
        garment_result = await db.execute(
            select(LibraryGarment).where(LibraryGarment.id == item_id)
        )
        garment = garment_result.scalar_one_or_none()
        if garment is None:
            raise HTTPException(status_code=404, detail="Garment not found")
        search_phrase = garment.amazon_search

    encoded = quote_plus(search_phrase.strip())
    url = f"{AMAZON_BASE}/s?k={encoded}&i=clothing&tag={AMAZON_TAG}"

    db.add(
        DemoClick(
            outfit_id=outfit_id,
            item_id=item_id,
            anon_session_id=seynario_anon,
        )
    )
    await db.commit()

    return RedirectResponse(url=url, status_code=302)
