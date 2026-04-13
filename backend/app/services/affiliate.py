from urllib.parse import quote_plus

AMAZON_TAG = "seynario-21"
AMAZON_BASE = "https://www.amazon.co.uk"


def generate_affiliate_link(search_query: str) -> dict:
    """Generate an Amazon affiliate search link with product info."""
    clean_query = search_query.strip()
    encoded = quote_plus(clean_query)
    
    return {
        "name": clean_query,
        "url": f"{AMAZON_BASE}/s?k={encoded}&i=clothing&tag={AMAZON_TAG}",
        "image_url": None,  # Will be populated when PA API access is granted
        "price": None,
        "retailer": "Amazon",
    }


def generate_product_links(buy_descriptions: list[str]) -> list[dict]:
    """Generate affiliate links for multiple items."""
    return [generate_affiliate_link(desc) for desc in buy_descriptions if desc]