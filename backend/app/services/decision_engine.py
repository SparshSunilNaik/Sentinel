"""Decision pipeline: Identity → Permission → Budget → Risk → Decision."""

from __future__ import annotations

import json
import time
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.audit import AuditLog
from app.models.policy import Policy
from app.models.request import AgentRequest
from app.models.system import SystemState
from app.schemas import (
    DecisionType,
    Explanation,
    PipelineStep,
    RequestCreate,
    RequestOut,
    RiskBreakdown,
)
from app.services.policy_engine import is_within_allowed_hours, parse_json_list
from app.services.risk_engine import compute_risk_score


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def get_system_state(db: Session) -> SystemState:
    state = db.query(SystemState).filter(SystemState.id == 1).first()
    if state is None:
        state = SystemState(id=1, kill_switch_active=False)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def agent_to_out_permissions(agent: Agent) -> list[str]:
    return parse_json_list(agent.permissions)


def serialize_request(req: AgentRequest) -> RequestOut:
    explanation = None
    pipeline = None
    if req.explanation:
        try:
            explanation = Explanation(**json.loads(req.explanation))
        except (json.JSONDecodeError, TypeError, ValueError):
            explanation = None
    if req.pipeline_steps:
        try:
            pipeline = [PipelineStep(**s) for s in json.loads(req.pipeline_steps)]
        except (json.JSONDecodeError, TypeError, ValueError):
            pipeline = None
    return RequestOut(
        request_id=req.request_id,
        agent_id=req.agent_id,
        agent_name=req.agent_name,
        action=req.action,
        amount=req.amount,
        currency=req.currency,
        customer_id=req.customer_id,
        customer_risk=req.customer_risk,
        status=req.status,
        decision=req.decision,
        risk_score=req.risk_score,
        risk_level=req.risk_level,
        policy_id=req.policy_id,
        reason=req.reason,
        explanation=explanation,
        pipeline_steps=pipeline,
        created_at=req.created_at,
        decided_at=req.decided_at,
        latency_ms=req.latency_ms,
    )


def evaluate_request(db: Session, payload: RequestCreate) -> RequestOut:
    started = time.perf_counter()
    steps: list[PipelineStep] = []
    now = datetime.now(UTC)

    state = get_system_state(db)
    agent = db.query(Agent).filter(Agent.agent_id == payload.agent_id).first()
    policy: Policy | None = None

    # --- Identity ---
    if agent is None:
        steps.append(
            PipelineStep(
                step="Identity",
                status="FAIL",
                message="Agent not registered in Sentinel control plane",
                detail={"agent_id": payload.agent_id},
            )
        )
        return _finalize_blocked(
            db,
            payload,
            steps,
            reason="Unregistered agent",
            started=started,
            now=now,
        )

    steps.append(
        PipelineStep(
            step="Identity",
            status="PASS",
            message=f"Agent verified: {agent.name}",
            detail={
                "agent_id": agent.agent_id,
                "department": agent.department,
                "trust_score": agent.trust_score,
                "status": agent.status,
            },
        )
    )

    # Kill switch short-circuit
    if state.kill_switch_active or agent.status == "STOPPED":
        steps.append(
            PipelineStep(
                step="Permission",
                status="FAIL",
                message="Emergency kill switch active — all agent execution halted",
                detail={"kill_switch": state.kill_switch_active, "agent_status": agent.status},
            )
        )
        for step_name in ("Budget", "Risk", "Decision"):
            steps.append(
                PipelineStep(
                    step=step_name,
                    status="SKIP",
                    message="Skipped due to kill switch",
                )
            )
        return _persist_decision(
            db,
            agent=agent,
            payload=payload,
            decision="DENIED",
            status="BLOCKED",
            reason="Kill switch active — request blocked",
            steps=steps,
            risk=None,
            policy=None,
            started=started,
            now=now,
            explanation=_build_explanation(
                decision="DENIED",
                agent=agent,
                policy=None,
                risk=None,
                payload=payload,
                reason="Global emergency kill switch is active. No agent actions may execute.",
            ),
        )

    policy = db.query(Policy).filter(Policy.policy_id == agent.policy_id).first()
    if policy is None or not policy.is_active:
        steps.append(
            PipelineStep(
                step="Permission",
                status="FAIL",
                message="No active policy bound to agent",
                detail={"policy_id": agent.policy_id},
            )
        )
        return _persist_decision(
            db,
            agent=agent,
            payload=payload,
            decision="DENIED",
            status="DENIED",
            reason="No active policy",
            steps=steps
            + [
                PipelineStep(step="Budget", status="SKIP", message="Skipped"),
                PipelineStep(step="Risk", status="SKIP", message="Skipped"),
                PipelineStep(step="Decision", status="FAIL", message="Denied — missing policy"),
            ],
            risk=None,
            policy=None,
            started=started,
            now=now,
            explanation=_build_explanation(
                decision="DENIED",
                agent=agent,
                policy=None,
                risk=None,
                payload=payload,
                reason="Agent has no active governance policy.",
            ),
        )

    # --- Permission ---
    allowed_actions = parse_json_list(policy.allowed_actions)
    allowed_depts = parse_json_list(policy.allowed_departments)
    agent_perms = parse_json_list(agent.permissions)

    permission_ok = True
    perm_messages: list[str] = []

    if payload.action not in allowed_actions and payload.action not in agent_perms:
        permission_ok = False
        perm_messages.append(f"Action '{payload.action}' not in allowed actions")
    if agent.department not in allowed_depts:
        permission_ok = False
        perm_messages.append(f"Department '{agent.department}' not permitted by policy")
    if not is_within_allowed_hours(policy, now):
        permission_ok = False
        perm_messages.append(
            f"Outside allowed hours ({policy.allowed_hours_start:02d}:00–{policy.allowed_hours_end:02d}:00 UTC)"
        )
    if agent.status not in ("ACTIVE", "DEGRADED"):
        permission_ok = False
        perm_messages.append(f"Agent status is {agent.status}")

    if not permission_ok:
        steps.append(
            PipelineStep(
                step="Permission",
                status="FAIL",
                message="; ".join(perm_messages),
                detail={
                    "allowed_actions": allowed_actions,
                    "allowed_departments": allowed_depts,
                },
            )
        )
        for step_name in ("Budget", "Risk"):
            steps.append(PipelineStep(step=step_name, status="SKIP", message="Skipped"))
        steps.append(
            PipelineStep(step="Decision", status="FAIL", message="Denied at permission gate")
        )
        return _persist_decision(
            db,
            agent=agent,
            payload=payload,
            decision="DENIED",
            status="DENIED",
            reason="; ".join(perm_messages),
            steps=steps,
            risk=None,
            policy=policy,
            started=started,
            now=now,
            explanation=_build_explanation(
                decision="DENIED",
                agent=agent,
                policy=policy,
                risk=None,
                payload=payload,
                reason="; ".join(perm_messages),
            ),
        )

    steps.append(
        PipelineStep(
            step="Permission",
            status="PASS",
            message=f"Action '{payload.action}' authorized for {agent.department}",
            detail={"action": payload.action, "policy": policy.policy_id},
        )
    )

    # --- Budget ---
    effective_daily = min(agent.daily_budget, policy.daily_budget)
    projected = agent.current_usage + payload.amount
    budget_ok = True
    budget_msgs: list[str] = []

    if payload.amount > policy.transaction_limit:
        budget_ok = False
        budget_msgs.append(
            f"Amount ₹{payload.amount:,.0f} exceeds transaction limit ₹{policy.transaction_limit:,.0f}"
        )
    if projected > effective_daily:
        budget_ok = False
        budget_msgs.append(
            f"Would exceed daily budget (usage ₹{agent.current_usage:,.0f} + ₹{payload.amount:,.0f} > ₹{effective_daily:,.0f})"
        )

    if not budget_ok:
        steps.append(
            PipelineStep(
                step="Budget",
                status="FAIL",
                message="; ".join(budget_msgs),
                detail={
                    "amount": payload.amount,
                    "transaction_limit": policy.transaction_limit,
                    "daily_budget": effective_daily,
                    "current_usage": agent.current_usage,
                },
            )
        )
        steps.append(PipelineStep(step="Risk", status="SKIP", message="Skipped"))
        steps.append(PipelineStep(step="Decision", status="FAIL", message="Denied at budget gate"))
        return _persist_decision(
            db,
            agent=agent,
            payload=payload,
            decision="DENIED",
            status="DENIED",
            reason="; ".join(budget_msgs),
            steps=steps,
            risk=None,
            policy=policy,
            started=started,
            now=now,
            explanation=_build_explanation(
                decision="DENIED",
                agent=agent,
                policy=policy,
                risk=None,
                payload=payload,
                reason="; ".join(budget_msgs),
            ),
        )

    remaining = effective_daily - agent.current_usage
    budget_warn = payload.amount > remaining * 0.5
    steps.append(
        PipelineStep(
            step="Budget",
            status="WARN" if budget_warn else "PASS",
            message=(
                f"Budget check passed — ₹{remaining:,.0f} remaining of ₹{effective_daily:,.0f}"
                + (" (high utilization)" if budget_warn else "")
            ),
            detail={
                "remaining": remaining,
                "daily_budget": effective_daily,
                "current_usage": agent.current_usage,
            },
        )
    )

    # --- Risk ---
    risk = compute_risk_score(
        amount=payload.amount,
        agent=agent,
        customer_risk=payload.customer_risk,
        transaction_limit=policy.transaction_limit,
        daily_budget=effective_daily,
    )
    risk_status = "PASS" if risk.level == "LOW" else "WARN" if risk.level == "MEDIUM" else "FAIL"
    steps.append(
        PipelineStep(
            step="Risk",
            status=risk_status if risk.score < policy.risk_threshold else "FAIL",
            message=f"Risk score {risk.score} ({risk.level})",
            detail=risk.model_dump(),
        )
    )

    # --- Decision ---
    decision: DecisionType
    reason: str

    if risk.score >= policy.risk_threshold:
        decision = "DENIED"
        reason = (
            f"Risk score {risk.score} exceeds denial threshold {policy.risk_threshold} "
            f"(level={risk.level})"
        )
        steps.append(PipelineStep(step="Decision", status="FAIL", message=reason))
    elif risk.score >= policy.escalate_above or risk.level == "HIGH":
        decision = "ESCALATED"
        reason = (
            f"Risk score {risk.score} requires human approval "
            f"(escalate ≥ {policy.escalate_above})"
        )
        steps.append(PipelineStep(step="Decision", status="WARN", message=reason))
    else:
        decision = "APPROVED"
        reason = f"All governance gates passed — risk {risk.score} ({risk.level})"
        steps.append(PipelineStep(step="Decision", status="PASS", message=reason))

    explanation = _build_explanation(
        decision=decision,
        agent=agent,
        policy=policy,
        risk=risk,
        payload=payload,
        reason=reason,
    )

    status_map = {"APPROVED": "APPROVED", "DENIED": "DENIED", "ESCALATED": "ESCALATED"}
    return _persist_decision(
        db,
        agent=agent,
        payload=payload,
        decision=decision,
        status=status_map[decision],
        reason=reason,
        steps=steps,
        risk=risk,
        policy=policy,
        started=started,
        now=now,
        explanation=explanation,
        apply_usage=(decision == "APPROVED"),
    )


def resolve_escalation(
    db: Session,
    request_id: str,
    *,
    approve: bool,
    operator: str,
    note: str | None = None,
) -> RequestOut:
    req = db.query(AgentRequest).filter(AgentRequest.request_id == request_id).first()
    if req is None:
        raise ValueError("Request not found")
    if req.status != "ESCALATED":
        raise ValueError("Request is not pending escalation")

    agent = db.query(Agent).filter(Agent.agent_id == req.agent_id).first()
    state = get_system_state(db)
    if state.kill_switch_active:
        raise ValueError("Kill switch active — cannot resolve escalation")

    decision = "APPROVED" if approve else "DENIED"
    reason = note or (
        f"Human operator {'approved' if approve else 'denied'} escalated request"
    )
    req.decision = decision
    req.status = decision
    req.reason = f"{reason} (operator: {operator})"
    req.decided_at = datetime.now(UTC)

    if approve and agent:
        agent.current_usage += req.amount
        agent.request_count_today += 1

    # Update explanation
    if req.explanation:
        try:
            expl = json.loads(req.explanation)
            expl["summary"] = f"Operator {decision.lower()}: {reason}"
            expl["decision_rationale"] = req.reason
            if approve:
                expl["why_approved"] = req.reason
                expl["why_escalated"] = None
            else:
                expl["why_denied"] = req.reason
                expl["why_escalated"] = None
            req.explanation = json.dumps(expl)
        except json.JSONDecodeError:
            pass

    _write_audit(db, req, operator=operator)
    db.commit()
    db.refresh(req)
    return serialize_request(req)


def _build_explanation(
    *,
    decision: str,
    agent: Agent,
    policy: Policy | None,
    risk: RiskBreakdown | None,
    payload: RequestCreate,
    reason: str,
) -> Explanation:
    effective_daily = agent.daily_budget
    if policy:
        effective_daily = min(agent.daily_budget, policy.daily_budget)
    remaining = max(effective_daily - agent.current_usage, 0.0)

    risk_factors: list[str] = []
    if risk:
        risk_factors = [
            f"Transaction amount contribution: {risk.amount_factor}",
            f"Agent trust contribution: {risk.trust_factor} (trust={agent.trust_score})",
            f"Budget pressure contribution: {risk.budget_factor}",
            f"Request frequency contribution: {risk.frequency_factor}",
            f"Customer risk contribution: {risk.customer_factor} ({payload.customer_risk})",
        ]

    policy_matched = (
        f"{policy.name} ({policy.policy_id}) v{policy.version}" if policy else "No policy matched"
    )
    budget_status = (
        f"₹{agent.current_usage:,.0f} used of ₹{effective_daily:,.0f} "
        f"(₹{remaining:,.0f} remaining)"
    )

    why_approved = why_denied = why_escalated = None
    if decision == "APPROVED":
        why_approved = reason
    elif decision == "DENIED":
        why_denied = reason
    else:
        why_escalated = reason

    return Explanation(
        summary=f"{decision}: {reason}",
        decision_rationale=reason,
        budget_status=budget_status,
        policy_matched=policy_matched,
        risk_factors=risk_factors,
        why_approved=why_approved,
        why_denied=why_denied,
        why_escalated=why_escalated,
    )


def _write_audit(db: Session, req: AgentRequest, operator: str | None = None) -> None:
    audit = AuditLog(
        audit_id=_new_id("AUD"),
        timestamp=datetime.now(UTC),
        agent_id=req.agent_id,
        agent_name=req.agent_name,
        action=req.action,
        amount=req.amount,
        decision=req.decision or req.status,
        reason=req.reason or "",
        risk_score=req.risk_score or 0.0,
        risk_level=req.risk_level or "LOW",
        policy_id=req.policy_id or "N/A",
        request_id=req.request_id,
        operator=operator,
    )
    db.add(audit)


def _persist_decision(
    db: Session,
    *,
    agent: Agent,
    payload: RequestCreate,
    decision: str,
    status: str,
    reason: str,
    steps: list[PipelineStep],
    risk: RiskBreakdown | None,
    policy: Policy | None,
    started: float,
    now: datetime,
    explanation: Explanation,
    apply_usage: bool = False,
) -> RequestOut:
    latency = round((time.perf_counter() - started) * 1000, 2)
    req = AgentRequest(
        request_id=_new_id("REQ"),
        agent_id=agent.agent_id,
        agent_name=agent.name,
        action=payload.action,
        amount=payload.amount,
        currency=payload.currency,
        customer_id=payload.customer_id,
        customer_risk=payload.customer_risk,
        status=status,
        decision=decision,
        risk_score=risk.score if risk else None,
        risk_level=risk.level if risk else None,
        policy_id=policy.policy_id if policy else agent.policy_id,
        reason=reason,
        explanation=explanation.model_dump_json(),
        pipeline_steps=json.dumps([s.model_dump() for s in steps]),
        created_at=now,
        decided_at=now if decision != "ESCALATED" else None,
        latency_ms=latency,
    )
    if decision == "ESCALATED":
        req.decided_at = None

    if apply_usage:
        agent.current_usage += payload.amount
        agent.request_count_today += 1
    elif decision == "ESCALATED":
        agent.request_count_today += 1

    # Soft risk level on agent from latest score
    if risk and risk.level == "HIGH":
        agent.risk_level = "HIGH"
    elif risk and risk.level == "MEDIUM" and agent.risk_level == "LOW":
        agent.risk_level = "MEDIUM"

    db.add(req)
    db.flush()
    if decision != "ESCALATED":
        _write_audit(db, req)
    else:
        # Still audit the escalation event
        _write_audit(db, req)
    db.commit()
    db.refresh(req)
    return serialize_request(req)


def _finalize_blocked(
    db: Session,
    payload: RequestCreate,
    steps: list[PipelineStep],
    *,
    reason: str,
    started: float,
    now: datetime,
) -> RequestOut:
    for step_name in ("Permission", "Budget", "Risk"):
        steps.append(PipelineStep(step=step_name, status="SKIP", message="Skipped"))
    steps.append(PipelineStep(step="Decision", status="FAIL", message=reason))
    latency = round((time.perf_counter() - started) * 1000, 2)
    req = AgentRequest(
        request_id=_new_id("REQ"),
        agent_id=payload.agent_id,
        agent_name="Unknown",
        action=payload.action,
        amount=payload.amount,
        currency=payload.currency,
        customer_id=payload.customer_id,
        customer_risk=payload.customer_risk,
        status="DENIED",
        decision="DENIED",
        risk_score=None,
        risk_level=None,
        policy_id=None,
        reason=reason,
        explanation=Explanation(
            summary=f"DENIED: {reason}",
            decision_rationale=reason,
            budget_status="N/A",
            policy_matched="N/A",
            risk_factors=[],
            why_denied=reason,
        ).model_dump_json(),
        pipeline_steps=json.dumps([s.model_dump() for s in steps]),
        created_at=now,
        decided_at=now,
        latency_ms=latency,
    )
    db.add(req)
    db.flush()
    _write_audit(db, req)
    db.commit()
    db.refresh(req)
    return serialize_request(req)
