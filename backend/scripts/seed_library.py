"""
Seeds the library_garments table from the wardrobe manifest.

Usage (from the backend/ directory, with venv active):
    python scripts/seed_library.py

Idempotent — re-running upserts. Match key is LibraryGarment.id (the slug).
"""

import asyncio
import json
from pathlib import Path

from app.database import SessionLocal
from app.models.library import LibraryGarment


# Manifest lives in the frontend so it's the single source of truth — the
# frontend reads it for any client-side rendering of library items, and this
# script reads it to populate the backend table. Path is relative to this
# script's location: scripts/seed_library.py → backend/ → seynario/ → frontend/
MANIFEST_PATH = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "data"
    / "wardrobe-manifest.json"
)


async def seed_library() -> None:
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(
            f"Manifest not found at {MANIFEST_PATH}. "
            "Make sure wardrobe-manifest.json is in frontend/src/data/."
        )

    with MANIFEST_PATH.open("r", encoding="utf-8") as f:
        items = json.load(f)

    print(f"Loaded {len(items)} items from {MANIFEST_PATH.name}")

    inserted = 0
    updated = 0

    async with SessionLocal() as db:
        for item in items:
            existing = await db.get(LibraryGarment, item["id"])

            if existing is None:
                db.add(
                    LibraryGarment(
                        id=item["id"],
                        name=item["name"],
                        svg_path=item["svg_path"],
                        category=item["category"],
                        subcategory=item.get("subcategory"),
                        colour=item.get("colour"),
                        pattern=item.get("pattern"),
                        material=item.get("material"),
                        season=item.get("season"),
                        formality=item.get("formality"),
                        amazon_search=item["amazon_search"],
                    )
                )
                inserted += 1
            else:
                existing.name = item["name"]
                existing.svg_path = item["svg_path"]
                existing.category = item["category"]
                existing.subcategory = item.get("subcategory")
                existing.colour = item.get("colour")
                existing.pattern = item.get("pattern")
                existing.material = item.get("material")
                existing.season = item.get("season")
                existing.formality = item.get("formality")
                existing.amazon_search = item["amazon_search"]
                updated += 1

        await db.commit()

    print(f"✓ {inserted} inserted, {updated} updated, {len(items)} total")


if __name__ == "__main__":
    asyncio.run(seed_library())