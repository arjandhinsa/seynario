import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DemoOutfit(Base):
    """
    Pre-generated outfit for the public demo flow. Composed of LibraryGarment
    items and rendered to non-authenticated users via /api/demo/scenarios/:id.

    Generated once via scripts/pregenerate_demo.py (runs the full GPT-4o
    stylist pipeline against a synthetic 12-item demo wardrobe). Read-only
    after that — never regenerated per-request, so cost is bounded.

    Keyed on (scenario_id, variant). Three variants per scenario gives the
    demo some non-determinism without the cost of live generation.
    """

    __tablename__ = "demo_outfits"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    scenario_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    variant: Mapped[int] = mapped_column(Integer, nullable=False)

    # Outfit composition. Structured list, ordered by render position:
    # [
    #   { "id": "navy-blazer",
    #     "position": "outerwear",
    #     "annotation": "soft-shoulder, lined sparingly — reads warm not corporate",
    #     "search_override": null },
    #   ...
    # ]
    # `id` references LibraryGarment.id (the slug).
    # `annotation` is the per-item handwritten note shown next to the polaroid.
    # `search_override` overrides LibraryGarment.amazon_search if the stylist
    # came up with a more specific query for this outfit. Usually null.
    items: Mapped[list] = mapped_column(JSON, nullable=False)

    # The whole-outfit "why this works" paragraph (DM Sans body in the UI).
    rationale: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional stylist insight, rendered as the yellow sticky note.
    # e.g. "scuff the heel slightly. perfect leather reads try-hard."
    sticky_note: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("scenario_id", "variant", name="uq_demo_scenario_variant"),
    )
