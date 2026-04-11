import json
import base64

from openai import AsyncOpenAI

from app.config import settings


client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def identify_garment(image_bytes: bytes) -> dict:
    # Convert image to base64 for the API
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = await client.chat.completions.create(
        model=settings.OPENAI_VISION_MODEL,
        max_tokens=500,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Identify this clothing item. Return ONLY a JSON object with these fields, no other text:
{
  "category": "top|bottom|outerwear|footwear|accessory",
  "subcategory": "specific type e.g. oxford shirt, slim jeans, chelsea boots",
  "colour": "primary colour",
  "pattern": "solid|striped|checked|floral|graphic|other",
  "material": "best guess of fabric e.g. cotton, denim, wool, leather",
  "season": "summer|winter|transitional|all",
  "formality": 1-5 where 1 is very casual like gym wear and 5 is very formal like a suit,
  "description": "one sentence description of the garment"
}"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}",
                            "detail": "low",  # "low" is cheaper, fine for clothing
                        },
                    },
                ],
            }
        ],
    )

    # Parse the JSON from the response
    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[1]  # Remove first line
        content = content.rsplit("```", 1)[0]  # Remove last fence

    return json.loads(content)