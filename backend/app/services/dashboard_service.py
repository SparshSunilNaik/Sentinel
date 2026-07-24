"""Dashboard aggregation and kill-switch operations."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.audit import AuditLog
from app.models.request import AgentRequest
from app.schemas import DashboardMetrics, KillSwitchState
from app.services.decision_engine import get_system_state


def get_dashboard_metrics(db: Session) -> DashboardMetrics:
    state = get_system_state(db)
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    total_agents = db.query(Agent).count()
    active_agents = db.query(Agent).filter(Agent.status == "ACTIVE").count()
    pending = db.query(AgentRequest).filter(AgentRequest.status.in_(["PENDING", "ESCALATED"])).count()

    todays = (
        db.query(AgentRequest)
        .filter(AgentRequest.created_at >= today_start)
        .filter(AgentRequest.decision.isnot(None))
        .all()
    )
    approved = sum(1 for r in todays if r.decision == "APPROVED")
    denied = sum(1 for r in todays if r.decision == "DENIED")
    escalated = sum(1 for r in todays if r.decision == "ESCALATED" or r.status == "ESCALATED")

    latencies = [r.latency_ms for r in todays if r.latency_ms is not None]
    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

    risk_alerts = (
        db.query(AgentRequest)
        .filter(AgentRequest.created_at >= today_start)
        .filter(AgentRequest.risk_level == "HIGH")
        .count()
    )

    spend = (
        db.query(func.coalesce(func.sum(Agent.current_usage), 0.0)).scalar() or 0.0
    )
    budgets = db.query(func.coalesce(func.sum(Agent.daily_budget), 0.0)).scalar() or 1.0
    util = round((float(spend) / float(budgets)) * 100, 1) if budgets else 0.0

    return DashboardMetrics(
        active_agents=active_agents,
        total_agents=total_agents,
        pending_requests=pending,
        todays_decisions=len(todays),
        approved_today=approved,
        denied_today=denied,
        escalated_today=escalated,
        average_policy_latency_ms=avg_latency,
        risk_alerts=risk_alerts,
        kill_switch_active=state.kill_switch_active,
        total_spend_today=float(spend),
        budget_utilization_pct=util,
    )


def set_kill_switch(
    db: Session,
    *,
    active: bool,
    reason: str | None,
    operator: str,
) -> KillSwitchState:
    state = get_system_state(db)
    state.kill_switch_active = active
    state.updated_at = datetime.now(UTC)

    if active:
        state.kill_switch_reason = reason or "Emergency stop activated by operator"
        state.kill_switch_activated_by = operator
        state.kill_switch_activated_at = datetime.now(UTC)
        agents = db.query(Agent).all()
        for agent in agents:
            agent.status = "STOPPED"
    else:
        state.kill_switch_reason = None
        state.kill_switch_activated_by = None
        state.kill_switch_activated_at = None
        # Restore agents to ACTIVE when kill switch is cleared
        agents = db.query(Agent).filter(Agent.status == "STOPPED").all()
        for agent in agents:
            agent.status = "ACTIVE"

    # Audit the kill switch event
    audit = AuditLog(
        audit_id=f"AUD-KS-{uuid.uuid4().hex[:10].upper()}",
        timestamp=datetime.now(UTC),
        agent_id="SYSTEM",
        agent_name="Sentinel Control Plane",
        action="KILL_SWITCH_ON" if active else "KILL_SWITCH_OFF",
        amount=0.0,
        decision="SYSTEM",
        reason=reason or ("Activated" if active else "Deactivated"),
        risk_score=100.0 if active else 0.0,
        risk_level="HIGH" if active else "LOW",
        policy_id="SYSTEM",
        request_id=f"SYS-{uuid.uuid4().hex[:8].upper()}",
        operator=operator,
    )
    db.add(audit)
    db.commit()
    db.refresh(state)

    return KillSwitchState(
        active=state.kill_switch_active,
        reason=state.kill_switch_reason,
        activated_by=state.kill_switch_activated_by,
        activated_at=state.kill_switch_activated_at,
    )


def get_kill_switch(db: Session) -> KillSwitchState:
    state = get_system_state(db)
    return KillSwitchState(
        active=state.kill_switch_active,
        reason=state.kill_switch_reason,
        activated_by=state.kill_switch_activated_by,
        activated_at=state.kill_switch_activated_at,
    )
