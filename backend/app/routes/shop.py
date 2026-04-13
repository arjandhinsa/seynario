from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.affiliate import generate_affiliate_link, generate_product_links


router = APIRouter()


class ProductResponse(BaseModel):
    name: str
    url: str
    image_url: str | None
    price: str | None
    retailer: str


@router.get("/search", response_model=list[ProductResponse])
async def search_products(
    query: str = Query(...),
    user_id: str = Depends(get_current_user),
):
    results = generate_product_links([query])
    return results