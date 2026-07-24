from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    allowed_actions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON
    allowed_departments: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON
    transaction_limit: Mapped[float] = mapped_column(Float, nullable=False, default=50000.0)
    daily_budget: Mapped[float] = mapped_column(Float, nullable=False, default=100000.0)
    allowed_hours_start: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    allowed_hours_end: Mapped[int] = mapped_column(Integer, nullable=False, default=23)
    risk_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=70.0)
    escalate_above: Mapped[float] = mapped_column(Float, nullable=False, default=55.0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
