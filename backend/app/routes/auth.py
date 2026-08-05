import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.limiter import limiter
from app.models.outfit import Outfit
from app.models.usage import UsageCounter
from app.models.user import User
from app.models.wardrobe import Garment
from app.services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, verify_token,
)
from app.services.image_store import delete_image
from app.middleware.auth import get_current_user


logger = logging.getLogger("seynario.auth")

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    body_type: str | None
    style_pref: str | None
    gender: str | None

class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    body_type: str | None = None
    style_pref: str | None = None
    gender: str | None = None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")  # stop account-farming around per-user quotas
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")  # slow credential stuffing
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, body: RefreshRequest):
    user_id = verify_token(body.refresh_token, expected_type="refresh")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id, email=user.email, display_name=user.display_name,
        body_type=user.body_type, style_pref=user.style_pref, gender=user.gender,
    )


@router.get("/me/export")
async def export_my_data(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Data export (UK GDPR right to portability): full JSON dump of the
    user's account, wardrobe, and outfits."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(Garment).where(Garment.user_id == user_id).order_by(Garment.created_at)
    )
    garments = result.scalars().all()

    result = await db.execute(
        select(Outfit).where(Outfit.user_id == user_id)
        .options(selectinload(Outfit.items)).order_by(Outfit.created_at)
    )
    outfits = result.scalars().all()

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": {
            "id": user.id, "email": user.email, "display_name": user.display_name,
            "body_type": user.body_type, "style_pref": user.style_pref,
            "gender": user.gender, "created_at": user.created_at.isoformat(),
        },
        "wardrobe": [
            {
                "id": g.id, "image_url": g.image_url, "category": g.category,
                "subcategory": g.subcategory, "colour": g.colour,
                "pattern": g.pattern, "material": g.material, "season": g.season,
                "formality": g.formality, "ai_description": g.ai_description,
                "created_at": g.created_at.isoformat(),
            }
            for g in garments
        ],
        "outfits": [
            {
                "id": o.id, "name": o.name, "rationale": o.rationale,
                "sticky_note": o.sticky_note, "scenario_id": o.scenario_id,
                "is_saved": o.is_saved, "created_at": o.created_at.isoformat(),
                "items": [
                    {
                        "id": i.id, "position": i.position, "is_owned": i.is_owned,
                        "garment_id": i.garment_id, "annotation": i.annotation,
                        "affiliate_name": i.affiliate_name,
                    }
                    for i in o.items
                ],
            }
            for o in outfits
        ],
    }


@router.delete("/me", status_code=204)
async def delete_my_account(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Account deletion that actually deletes: destroys every Cloudinary
    asset (confirmed, not just dereferenced), then removes all DB rows.

    If any Cloudinary deletion cannot be confirmed, the request fails
    with 502 and nothing is removed from the DB, so a retry can finish
    the job — no orphaned assets left behind."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(Garment).where(Garment.user_id == user_id))
    garments = result.scalars().all()

    failed = [g.image_url for g in garments if not delete_image(g.image_url)]
    if failed:
        logger.error(
            "Account deletion for %s aborted: %d Cloudinary assets not confirmed deleted",
            user_id, len(failed),
        )
        raise HTTPException(
            status_code=502,
            detail="Could not confirm deletion of all stored images. Please try again.",
        )

    # Outfits (items cascade via the ORM), garments, usage counters, user.
    result = await db.execute(
        select(Outfit).where(Outfit.user_id == user_id).options(selectinload(Outfit.items))
    )
    for outfit in result.scalars().all():
        await db.delete(outfit)
    for garment in garments:
        await db.delete(garment)
    await db.execute(sa_delete(UsageCounter).where(UsageCounter.scope == user_id))
    await db.delete(user)
    await db.commit()

    logger.info("Account %s deleted (%d garments, images confirmed gone)", user_id, len(garments))


@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.display_name is not None:
        user.display_name = body.display_name
    if body.body_type is not None:
        user.body_type = body.body_type
    if body.style_pref is not None:
        user.style_pref = body.style_pref
    if body.gender is not None:
        user.gender = body.gender

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=user.id, email=user.email, display_name=user.display_name,
        body_type=user.body_type, style_pref=user.style_pref, gender=user.gender,
    )
