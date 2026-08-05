import uuid

from sqlalchemy import String, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# Sentinel scope for the app-wide daily counter (global spend ceiling).
GLOBAL_SCOPE = "__global__"


class UsageCounter(Base):
    """Daily usage counters, keyed by scope + UTC date.

    scope is either a user id (per-user quota) or GLOBAL_SCOPE (app-wide
    spend ceiling). One row per scope per UTC day. Counts are incremented
    BEFORE each OpenAI call so attempts, not just successes, are bounded.
    """

    __tablename__ = "usage_counters"
    __table_args__ = (
        UniqueConstraint("scope", "date", name="uq_usage_scope_date"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    scope: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # "YYYY-MM-DD" UTC
    scan_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recommend_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
