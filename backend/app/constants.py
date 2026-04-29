"""
Application-level constants. Hand-edited config values that don't belong in
the .env file (which is for secrets) or the database (which is for runtime
state).
"""


# The 18 LibraryGarment IDs that compose the public demo wardrobe.
# Curated for unisex appeal, photogenic across all 14 scenarios, and
# coverage of every formality bucket from 1-5. Editing this list and
# re-running pregenerate_demo.py changes what the demo wardrobe looks
# like.
DEMO_WARDROBE_IDS: list[str] = [
    # Tops (5)
    "white-cotton-crew-tee",
    "black-cotton-crew-tee",
    "cream-linen-camp-collar-shirt",
    "white-oxford-button-down",
    "navy-crew-neck-sweater",
    "black-fine-knit-turtleneck",
    "striped-breton-long-sleeve",
    "grey-hoodie",
    # Bottoms (4)
    "indigo-wide-leg-jeans",
    "stone-chinos",
    "black-tailored-trousers",
    "black-gym-shorts",
    # Outerwear (1)
    "navy-blazer",
    "light-wash-denim-jacket",
    # Footwear (3)
    "white-leather-sneakers",
    "tan-leather-loafers",
    "grey-gym-trainers",
    # Accessories (1)
    "brown-leather-belt",
]


# How many alternate outfits to generate per scenario. 3 = solid demo
# variety without inflating spend. With the demo-tuned prompt below,
# all three are usually fillable from the wardrobe.
DEMO_VARIANTS_PER_SCENARIO: int = 3


# Scenarios excluded from the demo flow because the sample wardrobe
# can't reasonably dress them. The /api/demo route should hide these,
# and pregenerate_demo.py skips them.
DEMO_EXCLUDED_SCENARIOS: set[str] = {
    "Black Tie Event",  # No dinner jacket / formal evening wear in library
}