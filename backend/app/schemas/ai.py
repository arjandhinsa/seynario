"""Pydantic schemas for model output.

Everything the LLM returns is validated against these schemas before it
touches the database. vision.py and stylist.py parse the raw response,
validate, retry once with a corrective prompt on failure, then fail
cleanly. Unvalidated model output never reaches the DB.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class GarmentScanResult(BaseModel):
    """Validated response of the garment-scan vision call."""

    category: Literal["top", "bottom", "outerwear", "footwear", "accessory"]
    subcategory: str | None = Field(default=None, max_length=100)
    colour: str | None = Field(default=None, max_length=50)
    pattern: str | None = Field(default=None, max_length=50)
    material: str | None = Field(default=None, max_length=100)
    season: Literal["summer", "winter", "transitional", "all"] | None = None
    formality: int | None = Field(default=None, ge=1, le=5)
    description: str | None = Field(default=None, max_length=1000)

    @field_validator("season", "pattern", "colour", "subcategory", "material", mode="before")
    @classmethod
    def _normalise_strings(cls, v):
        if isinstance(v, str):
            v = v.strip().lower() or None
        return v


class OutfitItemPlan(BaseModel):
    position: Literal["top", "bottom", "outerwear", "footwear", "accessory", "shoes"]
    garment_id: str | None = Field(default=None, max_length=100)
    buy_description: str | None = Field(default=None, max_length=300)
    buy_image_search: str | None = Field(default=None, max_length=300)
    annotation: str | None = Field(default=None, max_length=500)


class OutfitPlan(BaseModel):
    name: str = Field(max_length=200)
    rationale: str = Field(max_length=2000)
    sticky_note: str | None = Field(default=None, max_length=300)
    items: list[OutfitItemPlan] = Field(min_length=1, max_length=10)


class OutfitPlanList(BaseModel):
    outfits: list[OutfitPlan] = Field(min_length=1, max_length=6)
