"""Policy evaluation helpers — parse stored JSON fields and validate constraints."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from app.models.policy import Policy


def parse_json_list(raw: str) -> list[str]:
    try:
        data = json.loads(raw or "[]")
        return [str(x) for x in data] if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def dump_json_list(items: list[str]) -> str:
    return json.dumps(items)


def is_within_allowed_hours(policy: Policy, when: datetime | None = None) -> bool:
    when = when or datetime.now(UTC)
    hour = when.hour
    start = policy.allowed_hours_start
    end = policy.allowed_hours_end
    if start <= end:
        return start <= hour <= end
    # Overnight window e.g. 22–6
    return hour >= start or hour <= end


def policy_to_dict(policy: Policy) -> dict:
    return {
        "policy_id": policy.policy_id,
        "name": policy.name,
        "description": policy.description,
        "allowed_actions": parse_json_list(policy.allowed_actions),
        "allowed_departments": parse_json_list(policy.allowed_departments),
        "transaction_limit": policy.transaction_limit,
        "daily_budget": policy.daily_budget,
        "allowed_hours_start": policy.allowed_hours_start,
        "allowed_hours_end": policy.allowed_hours_end,
        "risk_threshold": policy.risk_threshold,
        "escalate_above": policy.escalate_above,
        "is_active": policy.is_active,
        "version": policy.version,
        "updated_at": policy.updated_at,
    }
