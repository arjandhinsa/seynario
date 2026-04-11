import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Garment(Base):
    __tablename__ = "garments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # Cloudinary URL of the uploaded photo
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)

    # AI-detected attributes
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,  # "top", "bottom", "outerwear", "footwear", "accessory"
    )
    subcategory: Mapped[str] = mapped_column(
        String(100), nullable=True,  # "oxford shirt", "slim jeans", "chelsea boots"
    )
    colour: Mapped[str] = mapped_column(String(50), nullable=True)
    pattern: Mapped[str] = mapped_column(
        String(50), nullable=True,  # "solid", "striped", "checked", "floral"
    )
    material: Mapped[str] = mapped_column(String(100), nullable=True)
    season: Mapped[str] = mapped_column(
        String(50), nullable=True,  # "summer", "winter", "transitional", "all"
    )
    formality: Mapped[int] = mapped_column(
        Integer, nullable=True,  # 1=very casual, 5=very formal
    )
    ai_description: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    user = relationship("User", back_populates="garments")
