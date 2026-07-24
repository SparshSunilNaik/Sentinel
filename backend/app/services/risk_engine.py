"""Lightweight risk scoring model for financial agent actions."""

from __future__ import annotations

from app.models.agent import Agent
from app.schemas import RiskBreakdown, RiskLevel


CUSTOMER_RISK_WEIGHTS = {"LOW": 5.0, "MEDIUM": 20.0, "HIGH": 40.0}


def compute_risk_score(
    *,
    amount: float,
    agent: Agent,
    customer_risk: str,
    transaction_limit: float,
    daily_budget: float,
) -> RiskBreakdown:
    """Score 0–100 using amount, trust, budget headroom, frequency, and customer risk."""
    amount_factor = min(40.0, (amount / max(transaction_limit, 1.0)) * 40.0)

    trust_factor = (1.0 - agent.trust_score) * 25.0

    remaining = max(daily_budget - agent.current_usage, 0.0)
    if remaining <= 0:
        budget_factor = 25.0
    else:
        budget_factor = min(25.0, (amount / remaining) * 20.0)

    # Soft frequency pressure after ~8 requests/day
    frequency_factor = min(15.0, max(0.0, (agent.request_count_today - 5) * 2.5))

    customer_factor = CUSTOMER_RISK_WEIGHTS.get(customer_risk.upper(), 20.0)

    score = round(
        amount_factor + trust_factor + budget_factor + frequency_factor + customer_factor,
        1,
    )
    score = min(100.0, max(0.0, score))

    level: RiskLevel
    if score < 35:
        level = "LOW"
    elif score < 65:
        level = "MEDIUM"
    else:
        level = "HIGH"

    return RiskBreakdown(
        amount_factor=round(amount_factor, 1),
        trust_factor=round(trust_factor, 1),
        budget_factor=round(budget_factor, 1),
        frequency_factor=round(frequency_factor, 1),
        customer_factor=round(customer_factor, 1),
        score=score,
        level=level,
    )
