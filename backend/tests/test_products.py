"""Catalogue matching and the first-party affiliate redirect."""

from app.models.product import Product, ProductClick
from app.services.product_match import extract_colour, match_product
from sqlalchemy import select


def _product(**kw):
    defaults = dict(
        name="Navy crew neck sweater", category="top", colour="navy",
        formality=3, affiliate_url="https://example.com/p/1", active=True,
        source="curated",
    )
    defaults.update(kw)
    return Product(**defaults)


def test_extract_colour():
    assert extract_colour("mens slim fit navy cotton chinos") == "navy"
    assert extract_colour("gray marl tee") == "grey"
    assert extract_colour("linen shirt") is None


async def test_match_prefers_right_colour_and_formality(db):
    right = _product(name="Navy jumper", colour="navy", formality=3)
    wrong_colour = _product(name="Red jumper", colour="red", formality=3)
    db.add_all([right, wrong_colour])
    await db.commit()

    match = await match_product(db, "top", "navy wool jumper", formality=3)
    assert match is not None and match.name == "Navy jumper"


async def test_no_confident_match_returns_none(db):
    db.add(_product(name="Red jumper", colour="red", formality=1))
    await db.commit()

    # Wrong colour, distant formality — must NOT claim this product.
    match = await match_product(db, "top", "navy formal shirt", formality=5)
    assert match is None


async def test_inactive_products_never_match(db):
    db.add(_product(active=False))
    await db.commit()
    assert await match_product(db, "top", "navy sweater", formality=3) is None


async def test_redirect_records_click_then_302(client, db):
    p = _product()
    db.add(p)
    await db.commit()
    await db.refresh(p)

    resp = await client.get(f"/api/r/p/{p.id}", follow_redirects=False)
    assert resp.status_code == 302
    assert resp.headers["location"] == "https://example.com/p/1"

    result = await db.execute(select(ProductClick).where(ProductClick.product_id == p.id))
    assert len(result.scalars().all()) == 1


async def test_redirect_404_for_missing_or_inactive(client, db):
    p = _product(active=False)
    db.add(p)
    await db.commit()
    await db.refresh(p)

    assert (await client.get(f"/api/r/p/{p.id}", follow_redirects=False)).status_code == 404
    assert (await client.get("/api/r/p/nope", follow_redirects=False)).status_code == 404
