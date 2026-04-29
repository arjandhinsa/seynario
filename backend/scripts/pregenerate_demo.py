"""
Pre-generate cached demo outfits from the demo wardrobe.

Calls GPT-4o-mini directly with a demo-tuned system prompt that:
  - mandates wardrobe-only output (no buy_descriptions),
  - generates per-item annotations and an optional sticky_note,
  - writes in the Seynario sketchbook voice (specific, editorial,
    no filler words),
  - returns JSON exactly matching DemoOutfit.items shape.

Production stylist (services/stylist.py) is intentionally untouched.
When the redesign work consolidates voice across demo and live flows,
the prompt below is the reference.

Usage (from backend/, with venv active):
    ./venv/bin/python -m scripts.pregenerate_demo

Cost: ~14 GPT-4o-mini calls. About £0.02 total.
"""

import asyncio
import json

from openai import AsyncOpenAI
from sqlalchemy import select, delete

from app.config import settings
from app.constants import (
    DEMO_EXCLUDED_SCENARIOS,
    DEMO_VARIANTS_PER_SCENARIO,
    DEMO_WARDROBE_IDS,
)
from app.database import SessionLocal
from app.models.demo import DemoOutfit
from app.models.library import LibraryGarment
from app.models.scenario import Scenario


SYSTEM_PROMPT = """You are a fashion stylist writing for a designer's working sketchbook — Aesop catalogue meets Antonio Lopez fashion illustration. You compose outfits from a fixed sample wardrobe, never inventing items.

Voice rules:
- Confident, editorial, specific. Never generic.
- Rationale (60-90 words): tell the reader WHY this outfit reads correctly for THIS specific scenario. Not what's in it. Not how versatile it is. Use specific styling logic — colour relationships, silhouette, texture, formality calibration.
- Per-item annotation (8-15 words): ONE specific styling insight per piece. Examples of the right register: "drape over crease — softens the silhouette without slouching it", "earthy + worn-in — they say i thought about this, but only a little", "breathes well — hides nerves, photographs warm under bar lights".
- Sticky note (optional, ≤15 words): a single styling insight that elevates the look without saying "elevate". Examples: "scuff the heel slightly. perfect leather reads try-hard", "cuff once if it stays mild, twice if it doesn't". Set to null if you don't have a real one.
- British English. Lowercase first letter on annotations and sticky_notes is fine.

Banned words and phrases: "elevated", "elevate", "approachable", "polished", "perfect" as filler, "stylish", "effortlessly", "timeless", "looks great", "great for", "ideal for", "suitable for". If your draft contains these, rewrite the sentence.

Banned openers for rationale: "This outfit combines", "This outfit strikes", "This outfit features", "The combination of". Start with a specific observation about why this look works for this scenario.

Hard constraints:
- Use only items from the wardrobe provided. Reference items by their `id` slug exactly as given.
- Never invent items, never suggest buying anything.
- Each variant must include at minimum 1 top, 1 bottom, 1 footwear. Outerwear and accessories optional.
- Three variants per call. They must be meaningfully different from each other — different silhouette, different formality calibration within the allowed range, or different styling angle.

Output: JSON only. No prose outside the JSON object."""


def _build_user_prompt(wardrobe: list[dict], scenario: dict) -> str:
    wardrobe_json = json.dumps(wardrobe, indent=2)
    return f"""WARDROBE (the only items you may use — reference each by `id`):
{wardrobe_json}

SCENARIO:
- Name: {scenario['name']}
- Description: {scenario.get('description', '')}
- Style notes: {scenario.get('style_notes', '')}
- Formality range: {scenario['formality_min']}-{scenario['formality_max']} (out of 5)

Generate {DEMO_VARIANTS_PER_SCENARIO} distinct outfit variants. Return JSON matching this schema exactly:

{{
  "outfits": [
    {{
      "items": [
        {{
          "id": "<wardrobe item id>",
          "position": "top|bottom|outerwear|footwear|accessory",
          "annotation": "<8-15 word styling insight>"
        }}
      ],
      "rationale": "<60-90 word paragraph>",
      "sticky_note": "<≤15 word stylist insight or null>"
    }}
  ]
}}"""


_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _library_to_wardrobe_dict(item: LibraryGarment) -> dict:
    return {
        "id": item.id,
        "category": item.category,
        "subcategory": item.subcategory,
        "colour": item.colour,
        "material": item.material,
        "formality": item.formality,
    }


async def _compose_demo_outfits(
    wardrobe: list[dict], scenario: dict
) -> list[dict]:
    """Single GPT call → 3 demo-tuned outfit variants. Raises on failure."""
    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(wardrobe, scenario)},
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
    )
    raw = response.choices[0].message.content or ""
    parsed = json.loads(raw)
    outfits = parsed.get("outfits") or []
    if not isinstance(outfits, list) or not outfits:
        raise RuntimeError(f"stylist returned no outfits — raw: {raw[:300]}")
    return outfits


def _validate_outfit(outfit: dict, library_ids: set[str]) -> dict | None:
    """
    Defensive check: drop any outfit that snuck in an unknown id, has no
    items, or is missing required fields. Returns the outfit unchanged on
    success, or None if it should be skipped.
    """
    items = outfit.get("items")
    if not isinstance(items, list) or not items:
        return None
    cleaned_items = []
    for item in items:
        gid = item.get("id")
        if not gid or gid not in library_ids:
            return None  # demo is closed-set
        cleaned_items.append(
            {
                "id": gid,
                "position": item.get("position", "unknown"),
                "annotation": item.get("annotation"),
                "search_override": None,
            }
        )
    rationale = outfit.get("rationale", "").strip()
    if not rationale:
        return None
    sticky = outfit.get("sticky_note")
    if isinstance(sticky, str) and not sticky.strip():
        sticky = None
    return {"items": cleaned_items, "rationale": rationale, "sticky_note": sticky}


async def pregenerate() -> None:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set in backend/.env")

    async with SessionLocal() as db:
        result = await db.execute(
            select(LibraryGarment).where(LibraryGarment.id.in_(DEMO_WARDROBE_IDS))
        )
        wardrobe_items = list(result.scalars().all())

        if len(wardrobe_items) != len(DEMO_WARDROBE_IDS):
            found = {i.id for i in wardrobe_items}
            missing = sorted(set(DEMO_WARDROBE_IDS) - found)
            raise RuntimeError(
                f"Demo wardrobe items missing from library_garments: {missing}. "
                "Run `python -m scripts.seed_library` first."
            )

        wardrobe_dicts = [_library_to_wardrobe_dict(i) for i in wardrobe_items]
        library_ids = {i.id for i in wardrobe_items}

        result = await db.execute(select(Scenario).order_by(Scenario.sort_order))
        scenarios = [
            s for s in result.scalars().all() if s.name not in DEMO_EXCLUDED_SCENARIOS
        ]

        print(
            f"Pre-generating outfits for {len(scenarios)} scenarios "
            f"× {DEMO_VARIANTS_PER_SCENARIO} variants each, "
            f"using a {len(wardrobe_dicts)}-item demo wardrobe.\n"
        )

        total_inserted = 0
        total_skipped = 0
        failed: list[str] = []

        for scenario in scenarios:
            print(f"  → {scenario.name}...", end=" ", flush=True)
            scenario_dict = {
                "name": scenario.name,
                "description": scenario.description,
                "formality_min": scenario.formality_min,
                "formality_max": scenario.formality_max,
                "style_notes": scenario.style_notes,
            }

            try:
                raw_outfits = await _compose_demo_outfits(wardrobe_dicts, scenario_dict)
            except Exception as exc:
                print(f"FAILED ({type(exc).__name__}: {exc})")
                failed.append(scenario.name)
                continue

            await db.execute(
                delete(DemoOutfit).where(DemoOutfit.scenario_id == scenario.id)
            )

            inserted = 0
            skipped = 0
            for variant_idx, raw in enumerate(raw_outfits, start=1):
                validated = _validate_outfit(raw, library_ids)
                if validated is None:
                    skipped += 1
                    continue
                db.add(
                    DemoOutfit(
                        scenario_id=scenario.id,
                        variant=variant_idx,
                        items=validated["items"],
                        rationale=validated["rationale"],
                        sticky_note=validated["sticky_note"],
                    )
                )
                inserted += 1

            await db.commit()
            total_inserted += inserted
            total_skipped += skipped
            print(f"✓ {inserted} cached, {skipped} skipped")

        print()
        print(f"✓ {total_inserted} outfits cached across {len(scenarios)} scenarios")
        if total_skipped:
            print(f"⚠ {total_skipped} variants skipped (validation failed)")
        if failed:
            print(f"⚠ {len(failed)} scenarios failed: {', '.join(failed)}")


if __name__ == "__main__":
    asyncio.run(pregenerate())