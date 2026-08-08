"""Seed the curated product catalogue from the library garments.

Promotes every LibraryGarment into a Product with an Amazon affiliate
search URL (the same links the demo already uses), giving the matcher
~60 curated entries across every category on day one. Idempotent —
re-running updates existing rows by name instead of duplicating.

Run:  python scripts/seed_products.py
Then hand-curate: add better products (real product pages, real images)
directly to the products table; source="curated" rows are yours to edit.
"""

import asyncio
import sys
from pathlib import Path
from urllib.parse import quote_plus

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models.library import LibraryGarment  # noqa: E402
from app.models.product import Product  # noqa: E402


AMAZON_TAG = "seynario-21"


def amazon_url(search: str) -> str:
    return f"https://www.amazon.co.uk/s?k={quote_plus(search.strip())}&i=clothing&tag={AMAZON_TAG}"


async def main() -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(LibraryGarment))
        garments = result.scalars().all()
        if not garments:
            print("No library garments found — run seed_library.py first.")
            return

        created = updated = 0
        for g in garments:
            result = await db.execute(select(Product).where(Product.name == g.name))
            product = result.scalar_one_or_none()
            if product is None:
                product = Product(name=g.name)
                db.add(product)
                created += 1
            else:
                updated += 1

            product.category = g.category
            product.subcategory = g.subcategory
            product.colour = (g.colour or "").lower() or None
            product.formality = g.formality
            product.merchant = "Amazon UK"
            product.affiliate_url = amazon_url(g.amazon_search)
            product.image_url = g.svg_path  # frontend-served illustration
            product.source = "curated"
            product.active = True

        await db.commit()
        print(f"Products seeded: {created} created, {updated} updated.")


if __name__ == "__main__":
    asyncio.run(main())
