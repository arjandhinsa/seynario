from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LibraryGarment(Base):
    """
    A curated, system-owned garment used by the recommender for two purposes:
      1. The demo wardrobe (sample items shown to non-authenticated users).
      2. The gap-item pool (items the recommender suggests when the user
         doesn't own a suitable piece — these become the affiliate links).

    Distinct from `Garment` (which is user-owned, has a real user_id, and
    points at a Cloudinary photo). Library items are illustrated SVGs served
    from /frontend/public/wardrobe/.
    """

    __tablename__ = "library_garments"

    # Slug ID matching the manifest (e.g. "cream-linen-camp-collar-shirt").
    # Stable, human-readable, easy to debug.
    id: Mapped[str] = mapped_column(String(120), primary_key=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Path to the SVG, served from the frontend public folder.
    # e.g. "/wardrobe/cream-linen-camp-collar-shirt.svg"
    svg_path: Mapped[str] = mapped_column(String(500), nullable=False)

    # Same taxonomy as Garment so the recommender can match across both.
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subcategory: Mapped[str] = mapped_column(String(100), nullable=True)
    colour: Mapped[str] = mapped_column(String(50), nullable=True)
    pattern: Mapped[str] = mapped_column(String(50), nullable=True)
    material: Mapped[str] = mapped_column(String(100), nullable=True)
    season: Mapped[str] = mapped_column(String(50), nullable=True)
    formality: Mapped[int] = mapped_column(Integer, nullable=True)

    # 4–6 word phrase used to construct the Amazon affiliate URL.
    # Library-only field; not present on user-owned `Garment`.
    amazon_search: Mapped[str] = mapped_column(String(200), nullable=False)

    # Optional notes / AI-generated description (mirrors Garment.ai_description).
    description: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("svg_path", name="uq_library_svg_path"),
    )
