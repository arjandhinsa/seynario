from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, verify_token,
)
from app.middleware.auth import get_current_user


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
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
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
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
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
