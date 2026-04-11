import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(100), nullable=True,
    )

    # Fashion profile — set during onboarding or in settings
    body_type: Mapped[str] = mapped_column(
        String(50), nullable=True,  # "athletic", "slim", "curvy", "average", etc.
    )
    style_pref: Mapped[str] = mapped_column(
        String(50), nullable=True,  # "minimal", "streetwear", "classic", "smart-casual"
    )
    gender: Mapped[str] = mapped_column(
        String(20), nullable=True,  # For gendered recommendations
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    garments = relationship("Garment", back_populates="user")
    outfits = relationship("Outfit", back_populates="user")
