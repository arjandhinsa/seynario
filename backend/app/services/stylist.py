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

    prompt = f"""You are a personal stylist for the Seynario app by SEYN. 
Given this person's wardrobe and their upcoming scenario, recommend {num_outfits} complete outfits.

## Scenario
Name: {scenario.get('name', 'Unknown')}
Description: {scenario.get('description', '')}
Formality range: {scenario.get('formality_min', 1)}-{scenario.get('formality_max', 5)} out of 5
Style notes: {scenario.get('style_notes', '')}
{profile_text}

## Their Wardrobe
{wardrobe_text if wardrobe_text else "Wardrobe is empty — recommend items to buy."}

## Instructions
- Use items from their wardrobe wherever possible (reference by id)
- If they're missing a key piece, describe what they should buy (set garment_id to null)
- Each outfit needs: a name, a rationale explaining WHY it works for this scenario, and a list of items
- Each item needs: position (top, bottom, outerwear, footwear, accessory), and either a garment_id from their wardrobe or a buy_description for something new
- Be specific about WHY each piece works — colour theory, formality matching, texture contrast
- Use British English

Return ONLY a JSON array, no other text:
[
  {{
    "name": "outfit name",
    "rationale": "2-3 sentences on why this works for the scenario",
    "items": [
      {{"position": "top", "garment_id": "abc-123", "buy_description": null}},
      {{"position": "bottom", "garment_id": null, "buy_description": "slim navy chinos in cotton"}}
    ]
  }}
]"""

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
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