import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    scenario_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scenarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=True)  # AI-generated name
    rationale: Mapped[str] = mapped_column(Text, nullable=True)  # WHY this works
    # Optional ≤15-word stylist note ("scuff the heel slightly. perfect
    # leather reads try-hard"). Mirrors DemoOutfit.sticky_note so the
    # production OutfitDetail can render the same yellow callout.
    sticky_note: Mapped[str] = mapped_column(Text, nullable=True)
    is_saved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="outfits")
    items = relationship(
        "OutfitItem", back_populates="outfit", cascade="all, delete-orphan",
    )


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    outfit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("outfits.id", ondelete="CASCADE"),
        nullable=False,
    )

    # If from the user's wardrobe
    garment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("garments.id", ondelete="SET NULL"),
        nullable=True,
    )

    # If an affiliate suggestion (not owned)
    affiliate_url: Mapped[str] = mapped_column(String(500), nullable=True)
    affiliate_image: Mapped[str] = mapped_column(String(500), nullable=True)
    affiliate_name: Mapped[str] = mapped_column(String(200), nullable=True)
    affiliate_price: Mapped[str] = mapped_column(String(20), nullable=True)

    position: Mapped[str] = mapped_column(
        String(50), nullable=False,  # "top", "bottom", "shoes", "outerwear", "accessory"
    )
    # Per-item handwritten note shown next to the polaroid in OutfitDetail.
    # 8-15 word styling insight ("drape over crease — softens the silhouette
    # without slouching it"). Mirrors the demo flow's item annotations.
    annotation: Mapped[str] = mapped_column(String(500), nullable=True)
    is_owned: Mapped[bool] = mapped_column(Boolean, default=True)

    outfit = relationship("Outfit", back_populates="items")
