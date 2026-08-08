"""Dead-link checker for the product catalogue.

Products go out of stock and URLs die. This HEAD-requests every active
product's affiliate URL and deactivates rows that clearly fail
(connection errors or 404/410). Search-page links (Amazon) rarely die,
so this matters more once real product-page URLs enter the catalogue.

Run weekly:  python scripts/check_product_links.py
(cron, or a scheduled GitHub Action once traffic justifies it)
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models.product import Product  # noqa: E402


DEAD_STATUSES = {404, 410}


async def main() -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(Product).where(Product.active.is_(True)))
        products = result.scalars().all()

        deactivated = 0
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (SeynarioLinkCheck)"},
        ) as client:
            for p in products:
                if not p.affiliate_url.startswith("http"):
                    continue
                try:
                    resp = await client.head(p.affiliate_url)
                    dead = resp.status_code in DEAD_STATUSES
                except httpx.HTTPError:
                    dead = True

                p.last_checked_at = datetime.now(timezone.utc)
                if dead:
                    p.active = False
                    deactivated += 1
                    print(f"DEAD → deactivated: {p.name} ({p.affiliate_url})")

        await db.commit()
        print(f"Checked {len(products)} products, deactivated {deactivated}.")


if __name__ == "__main__":
    asyncio.run(main())
