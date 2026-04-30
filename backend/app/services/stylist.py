import json

from openai import AsyncOpenAI

from app.config import settings


client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_outfits(
    wardrobe: list[dict],
    scenario: dict,
    user_profile: dict | None = None,
    num_outfits: int = 3,
) -> list[dict]:
    # Build a description of the user's wardrobe for the prompt
    wardrobe_text = "\n".join([
        f"- {g.get('subcategory', g['category'])}: {g.get('colour', 'unknown')} {g.get('material', '')} "
        f"(formality: {g.get('formality', '?')}/5, season: {g.get('season', 'all')}, id: {g['id']})"
        for g in wardrobe
    ])

    profile_text = ""
    if user_profile:
        parts = []
        if user_profile.get("gender"): parts.append(f"Gender: {user_profile['gender']}")
        if user_profile.get("body_type"): parts.append(f"Body type: {user_profile['body_type']}")
        if user_profile.get("style_pref"): parts.append(f"Style preference: {user_profile['style_pref']}")
        if parts:
            profile_text = f"\n\nUser profile:\n" + "\n".join(parts)

    prompt = f"""You are a fashion stylist writing for a designer's working sketchbook — Aesop catalogue meets Antonio Lopez fashion illustration. You compose outfits for a real person from their wardrobe, suggesting purchases only where genuinely necessary.

## VOICE RULES (non-negotiable)
- Confident, editorial, specific. Never generic.
- Rationale (60-90 words): tell the reader WHY this outfit reads correctly for THIS specific scenario. Not what's in it. Not how versatile it is. Use specific styling logic — colour relationships, silhouette, texture, formality calibration.
- Per-item annotation (8-15 words): ONE specific styling insight per piece. Examples of the right register: "drape over crease — softens the silhouette without slouching it", "earthy + worn-in — they say i thought about this, but only a little", "breathes well — hides nerves, photographs warm under bar lights".
- Sticky note (optional, ≤15 words): a single styling insight that elevates the look without saying "elevate". Examples: "scuff the heel slightly. perfect leather reads try-hard", "cuff once if it stays mild, twice if it doesn't". Set to null if you don't have a real one.
- British English. Lowercase first letter on annotations and sticky_notes is fine.

Banned words and phrases: "elevated", "elevate", "approachable", "polished", "perfect" as filler, "stylish", "effortlessly", "timeless", "looks great", "great for", "ideal for", "suitable for". If your draft contains these, rewrite the sentence.

Banned openers for rationale: "This outfit combines", "This outfit strikes", "This outfit features", "The combination of". Start with a specific observation about why this look works for this scenario.

## CRITICAL RULES
- NEVER recommend items that are inappropriate for the scenario's formality level
- PRIORITISE using wardrobe pieces, but ONLY if they are genuinely appropriate for the scenario
- If a wardrobe item doesn't match the scenario (e.g. a hoodie for a job interview, trainers for a wedding), DO NOT USE IT — suggest a purchase instead
- It is BETTER to recommend buying appropriate items than to force-fit inappropriate wardrobe pieces
- If the wardrobe has nothing suitable for a scenario, recommend an entirely new outfit to buy
- When suggesting items to buy, be VERY specific in buy_description — include the user's gender, fit, colour, material, and item type (e.g. "slim fit white Oxford cotton shirt" not just "white shirt"). Use the user's gender from their profile.
- buy_description must be written as a search query, not a sentence (e.g. "mens slim fit navy cotton chinos" not "a pair of slim-fitting navy chinos made from cotton")

## Scenario
Name: {scenario.get('name', 'Unknown')}
Description: {scenario.get('description', '')}
Formality range: {scenario.get('formality_min', 1)}-{scenario.get('formality_max', 5)} out of 5
Style notes: {scenario.get('style_notes', '')}
{profile_text}

## Their Wardrobe
{wardrobe_text if wardrobe_text else "Wardrobe is empty — recommend items to buy."}

## Output

Generate {num_outfits} distinct outfits. Each outfit needs a name, a rationale (60-90 words, voice rules above), an optional sticky_note (≤15 words or null), and a list of items. Each item needs: position (top, bottom, outerwear, footwear, accessory), an annotation (8-15 word styling insight, voice rules above), and either a garment_id from their wardrobe or a buy_description for something new.

Return ONLY a JSON array, no other text:
[
  {{
    "name": "outfit name",
    "rationale": "60-90 word paragraph on why this works for the scenario",
    "sticky_note": "≤15 word stylist insight or null",
    "items": [
      {{"position": "top", "garment_id": "abc-123", "buy_description": null, "annotation": "8-15 word styling insight for this piece"}},
      {{"position": "bottom", "garment_id": null, "buy_description": "mens slim fit navy cotton chinos", "buy_image_search": "navy slim chinos men", "annotation": "8-15 word styling insight for this piece"}}
    ]
  }}
]"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content.strip()

    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    outfits = json.loads(content)

    return {
        "outfits": outfits,
        "usage": {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
        },
    }