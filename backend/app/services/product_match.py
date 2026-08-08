"""Match a model buy-suggestion to a curated catalogue product.

The stylist outputs structured buy-items (category via position, plus a
free-text description). We score catalogue products deterministically —
category gate first, then colour and formality proximity — and only
return a match that clears a confidence threshold. A weak match is worse
than no match: the caller falls back to the existing Amazon search link,
so the user never sees a navy tie when they were told "brown loafers".
"""

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product


# Positions map to catalogue categories; "shoes" is a model synonym.
POSITION_TO_CATEGORY = {
    "top": "top", "bottom": "bottom", "outerwear": "outerwear",
    "footwear": "footwear", "shoes": "footwear", "accessory": "accessory",
}

MIN_SCORE = 3  # category match alone isn't enough to claim "this product"

COLOURS = [
    "black", "white", "cream", "beige", "tan", "brown", "navy", "blue",
    "grey", "gray", "green", "olive", "khaki", "red", "burgundy", "pink",
    "purple", "yellow", "mustard", "orange", "silver", "gold", "charcoal",
    "stone", "indigo",
]


def extract_colour(text: str) -> str | None:
    """First colour word found in a buy description, if any."""
    words = re.findall(r"[a-z]+", (text or "").lower())
    for w in words:
        if w in COLOURS:
            return "grey" if w == "gray" else w
    return None


def score_product(product: Product, category: str, colour: str | None,
                  formality: int | None, gender: str | None) -> int:
    if product.category != category or not product.active:
        return 0
    score = 1  # category gate passed

    if colour and product.colour:
        if product.colour == colour:
            score += 3
        else:
            score -= 1  # explicitly the wrong colour is worse than unknown

    if formality is not None and product.formality is not None:
        distance = abs(product.formality - formality)
        score += max(0, 2 - distance)  # +2 exact, +1 off-by-one

    if gender and product.gender and product.gender != gender:
        return 0  # never cross an explicit gender boundary

    return score


async def match_product(
    db: AsyncSession,
    position: str,
    buy_description: str | None,
    formality: int | None = None,
    gender: str | None = None,
) -> Product | None:
    """Best catalogue product for a buy-item, or None if nothing clears
    the confidence threshold."""
    category = POSITION_TO_CATEGORY.get((position or "").lower())
    if category is None:
        return None

    colour = extract_colour(buy_description)

    result = await db.execute(
        select(Product).where(Product.category == category, Product.active.is_(True))
    )
    candidates = result.scalars().all()

    best, best_score = None, 0
    for p in candidates:
        s = score_product(p, category, colour, formality, gender)
        if s > best_score:
            best, best_score = p, s

    return best if best_score >= MIN_SCORE else None
