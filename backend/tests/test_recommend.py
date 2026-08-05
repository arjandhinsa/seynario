"""Recommendation endpoint: with the LLM mocked, output is deterministic
and sane — owned garments map to wardrobe items, buy-suggestions get
affiliate search links, incomplete profiles are rejected."""

import app.routes.outfits as outfits_route
from app.models.scenario import Scenario
from app.models.wardrobe import Garment
from tests.conftest import bearer


async def _setup_user(client, db, auth_token):
    """Complete the style profile and seed a scenario + one owned garment."""
    resp = await client.put("/api/auth/me", headers=bearer(auth_token), json={
        "gender": "male", "body_type": "athletic", "style_pref": "minimal",
    })
    assert resp.status_code == 200
    user_id = resp.json()["id"]

    scenario = Scenario(
        name="Job Interview", description="Look sharp.",
        category="professional", formality_min=4, formality_max=5,
    )
    garment = Garment(
        user_id=user_id, image_url="https://example.com/shirt.jpg",
        category="top", subcategory="oxford shirt", colour="white",
        formality=4,
    )
    db.add_all([scenario, garment])
    await db.commit()
    await db.refresh(scenario)
    await db.refresh(garment)
    return scenario, garment


def _fake_generate(garment_id):
    async def fake(wardrobe, scenario, user_profile=None, num_outfits=3):
        return {
            "outfits": [{
                "name": "The Composed Candidate",
                "rationale": "Crisp white oxford anchors the look for a formal room.",
                "sticky_note": None,
                "items": [
                    {"position": "top", "garment_id": garment_id,
                     "buy_description": None, "annotation": "collar open, no tie"},
                    {"position": "bottom", "garment_id": None,
                     "buy_description": "mens slim fit charcoal wool trousers",
                     "annotation": "break just above the shoe"},
                ],
            }],
            "usage": {"input_tokens": 100, "output_tokens": 100},
        }
    return fake


async def test_recommend_maps_owned_and_buy_items(client, db, auth_token, monkeypatch):
    scenario, garment = await _setup_user(client, db, auth_token)
    monkeypatch.setattr(outfits_route, "generate_outfits", _fake_generate(garment.id))

    resp = await client.post("/api/outfits/recommend", headers=bearer(auth_token), json={
        "scenario_id": scenario.id, "num_outfits": 1,
    })
    assert resp.status_code == 201, resp.text
    outfit = resp.json()[0]
    assert outfit["name"] == "The Composed Candidate"

    owned = next(i for i in outfit["items"] if i["is_owned"])
    assert owned["garment_id"] == garment.id
    assert owned["image_url"] == garment.image_url

    buy = next(i for i in outfit["items"] if not i["is_owned"])
    assert buy["garment_id"] is None
    assert "amazon.co.uk" in buy["affiliate_url"]
    assert "tag=seynario-21" in buy["affiliate_url"]


async def test_recommend_is_deterministic_given_fixed_model_output(
    client, db, auth_token, monkeypatch,
):
    scenario, garment = await _setup_user(client, db, auth_token)
    monkeypatch.setattr(outfits_route, "generate_outfits", _fake_generate(garment.id))

    body = {"scenario_id": scenario.id, "num_outfits": 1}
    first = (await client.post("/api/outfits/recommend", headers=bearer(auth_token), json=body)).json()
    second = (await client.post("/api/outfits/recommend", headers=bearer(auth_token), json=body)).json()

    strip = lambda o: {k: v for k, v in o.items() if k != "id"}  # noqa: E731
    assert strip(first[0])["name"] == strip(second[0])["name"]
    assert strip(first[0])["rationale"] == strip(second[0])["rationale"]
    assert [i["position"] for i in first[0]["items"]] == [i["position"] for i in second[0]["items"]]


async def test_recommend_rejects_incomplete_profile(client, db, auth_token):
    # No profile set — endpoint must refuse before any spend.
    scenario = Scenario(
        name="First Date", description="Warm, relaxed.",
        category="social", formality_min=2, formality_max=3,
    )
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)

    resp = await client.post("/api/outfits/recommend", headers=bearer(auth_token), json={
        "scenario_id": scenario.id,
    })
    assert resp.status_code == 400


async def test_recommend_caps_num_outfits(client, db, auth_token):
    resp = await client.post("/api/outfits/recommend", headers=bearer(auth_token), json={
        "scenario_id": "anything", "num_outfits": 99,
    })
    assert resp.status_code == 422  # pydantic bound: 1-5
