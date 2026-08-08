import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Product(Base):
    """Curated affiliate catalogue.

    Deliberately source-agnostic: `source` is "curated" today; a future
    Awin/Rakuten feed ingester writes rows with source="awin" etc. and
    nothing else in the codebase changes. The matcher only reads
    category/colour/formality; the redirect only reads affiliate_url.
    """

    __tablename__ = "products"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    subcategory: Mapped[str] = mapped_column(String(100), nullable=True)
    colour: Mapped[str] = mapped_column(String(50), nullable=True)
    formality: Mapped[int] = mapped_column(Integer, nullable=True)  # 1-5
    gender: Mapped[str] = mapped_column(String(20), nullable=True)  # "male"/"female"/None=unisex
    merchant: Mapped[str] = mapped_column(String(100), nullable=True)
    affiliate_url: Mapped[str] = mapped_column(String(600), nullable=False)
    image_url: Mapped[str] = mapped_column(String(600), nullable=True)
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="curated")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )


class ProductClick(Base):
    """First-party click log for production affiliate links — never rely
    on network dashboards for your own numbers."""

    __tablename__ = "product_clicks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )
