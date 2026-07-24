from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    department: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ACTIVE")
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="LOW")
    trust_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.85)
    permissions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON list
    daily_budget: Mapped[float] = mapped_column(Float, nullable=False, default=100000.0)
    current_usage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    request_count_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
