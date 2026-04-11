import uuid

from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False,  # "Job Interview", "First Date", "Wedding Guest"
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=True)  # Emoji
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,  # "professional", "social", "formal", "casual"
    )
    formality_min: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    formality_max: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    style_notes: Mapped[str] = mapped_column(
        Text, nullable=True,  # AI prompt context for outfit generation
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
