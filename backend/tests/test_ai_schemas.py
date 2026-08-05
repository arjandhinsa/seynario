"""Structured output validation: model JSON must pass the schema before
it can reach the DB; malformed output raises instead of slipping through."""

import pytest
from pydantic import ValidationError

from app.services.stylist import parse_outfits_response
from app.services.vision import parse_scan_response


def test_valid_scan_response_parses():
    result = parse_scan_response("""
    {"category": "top", "subcategory": "Oxford Shirt", "colour": "White",
     "pattern": "solid", "material": "cotton", "season": "all",
     "formality": 4, "description": "A crisp white oxford shirt."}
    """)
    assert result.category == "top"
    assert result.subcategory == "oxford shirt"  # normalised to lowercase


def test_scan_response_with_code_fences_parses():
    result = parse_scan_response('```json\n{"category": "footwear"}\n```')
    assert result.category == "footwear"


def test_scan_response_invalid_category_rejected():
    with pytest.raises(ValidationError):
        parse_scan_response('{"category": "hat-but-invalid"}')


def test_scan_response_out_of_range_formality_rejected():
    with pytest.raises(ValidationError):
        parse_scan_response('{"category": "top", "formality": 11}')


def test_scan_response_non_json_rejected():
    with pytest.raises(Exception):
        parse_scan_response("Sure! Here is the garment you asked about: it's a nice shirt.")


def test_valid_outfit_response_parses():
    plan = parse_outfits_response("""
    [{"name": "Look", "rationale": "Reads right for the room.",
      "sticky_note": null,
      "items": [{"position": "top", "garment_id": "abc", "buy_description": null,
                 "annotation": "collar open"}]}]
    """)
    assert len(plan.outfits) == 1
    assert plan.outfits[0].items[0].position == "top"


def test_outfit_response_empty_items_rejected():
    with pytest.raises(ValidationError):
        parse_outfits_response('[{"name": "Look", "rationale": "x", "items": []}]')
