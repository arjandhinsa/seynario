import json
import base64
import logging

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.config import settings
from app.schemas.ai import GarmentScanResult


logger = logging.getLogger("seynario.vision")

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class VisionParseError(Exception):
    """Model output could not be parsed/validated after a retry."""


SCAN_PROMPT = """Identify this clothing item. Return ONLY a JSON object with these fields, no other text:
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


def _strip_code_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]  # Remove first line
        content = content.rsplit("```", 1)[0]  # Remove last fence
    return content.strip()


def parse_scan_response(content: str) -> GarmentScanResult:
    """Parse + schema-validate a raw model reply. Raises on bad output."""
    return GarmentScanResult.model_validate(json.loads(_strip_code_fences(content)))


async def identify_garment(image_bytes: bytes) -> dict:
    """Identify a garment from JPEG bytes. Returns a schema-validated dict.

    The model response is validated against GarmentScanResult; on
    parse/validation failure it retries once with a corrective prompt,
    then raises VisionParseError. Unvalidated model output never leaves
    this function.
    """
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": SCAN_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{b64_image}",
                        "detail": "low",  # "low" is cheaper, fine for clothing
                    },
                },
            ],
        }
    ]

    response = await client.chat.completions.create(
        model=settings.OPENAI_VISION_MODEL, max_tokens=500, messages=messages,
    )
    content = response.choices[0].message.content or ""

    try:
        return parse_scan_response(content).model_dump()
    except (json.JSONDecodeError, ValidationError) as first_error:
        logger.warning("Scan response failed validation, retrying once: %s", first_error)
        retry_error = first_error

    # One corrective retry: show the model its bad output and the error.
    messages.append({"role": "assistant", "content": content})
    messages.append({
        "role": "user",
        "content": (
            "Your previous reply was not valid against the required schema. "
            f"Error: {retry_error}. Reply again with ONLY the corrected JSON "
            "object, exactly matching the schema in my first message."
        ),
    })
    response = await client.chat.completions.create(
        model=settings.OPENAI_VISION_MODEL, max_tokens=500, messages=messages,
    )
    content = response.choices[0].message.content or ""

    try:
        return parse_scan_response(content).model_dump()
    except (json.JSONDecodeError, ValidationError) as second_error:
        logger.error("Scan response failed validation after retry: %s", second_error)
        raise VisionParseError(str(second_error)) from second_error
