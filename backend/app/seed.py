"""Seed realistic mock agents, policies, and sample audit history."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.agent import Agent
from app.models.audit import AuditLog
from app.models.policy import Policy
from app.models.request import AgentRequest
from app.models.system import SystemState
from app.models.user import User

settings = get_settings()

POLICIES = [
    {
        "policy_id": "POL-TRAVEL",
        "name": "Travel Agent Governance",
        "description": "Controls rebooking, upgrades, and travel reimbursements.",
        "allowed_actions": [
            "Rebook Flight",
            "Upgrade Cabin",
            "Issue Travel Credit",
            "Cancel Booking",
        ],
        "allowed_departments": ["Travel"],
        "transaction_limit": 50000.0,
        "daily_budget": 200000.0,
        "allowed_hours_start": 0,
        "allowed_hours_end": 23,
        "risk_threshold": 75.0,
        "escalate_above": 50.0,
    },
    {
        "policy_id": "POL-DISPUTE",
        "name": "Dispute Resolution Governance",
        "description": "Governs chargebacks, reversals, and provisional credits.",
        "allowed_actions": [
            "Reverse Transaction",
            "Issue Provisional Credit",
            "Open Dispute Case",
            "Close Dispute",
        ],
        "allowed_departments": ["Disputes"],
        "transaction_limit": 25000.0,
        "daily_budget": 150000.0,
        "allowed_hours_start": 6,
        "allowed_hours_end": 22,
        "risk_threshold": 70.0,
        "escalate_above": 45.0,
    },
    {
        "policy_id": "POL-BENEFITS",
        "name": "Card Benefits Governance",
        "description": "Purchase protection, extended warranty, and benefit claims.",
        "allowed_actions": [
            "Approve Purchase Protection",
            "Approve Extended Warranty",
            "Deny Benefit Claim",
            "Request Documentation",
        ],
        "allowed_departments": ["Benefits"],
        "transaction_limit": 15000.0,
        "daily_budget": 80000.0,
        "allowed_hours_start": 8,
        "allowed_hours_end": 20,
        "risk_threshold": 65.0,
        "escalate_above": 40.0,
    },
    {
        "policy_id": "POL-SERVICING",
        "name": "Customer Servicing Governance",
        "description": "Account servicing actions including fee waivers and limit changes.",
        "allowed_actions": [
            "Waive Annual Fee",
            "Adjust Credit Limit",
            "Update Contact Info",
            "Issue Statement Credit",
        ],
        "allowed_departments": ["Servicing"],
        "transaction_limit": 10000.0,
        "daily_budget": 60000.0,
        "allowed_hours_start": 7,
        "allowed_hours_end": 21,
        "risk_threshold": 60.0,
        "escalate_above": 35.0,
    },
]

AGENTS = [
    {
        "agent_id": "AGT-TRAVEL-01",
        "name": "Travel Agent",
        "department": "Travel",
        "description": "Autonomous agent for itinerary changes and travel reimbursements.",
        "status": "ACTIVE",
        "risk_level": "LOW",
        "trust_score": 0.92,
        "permissions": [
            "Rebook Flight",
            "Upgrade Cabin",
            "Issue Travel Credit",
            "Cancel Booking",
        ],
        "daily_budget": 200000.0,
        "current_usage": 42500.0,
        "request_count_today": 4,
        "policy_id": "POL-TRAVEL",
    },
    {
        "agent_id": "AGT-DISPUTE-01",
        "name": "Dispute Agent",
        "department": "Disputes",
        "description": "Handles transaction disputes, chargebacks, and provisional credits.",
        "status": "ACTIVE",
        "risk_level": "MEDIUM",
        "trust_score": 0.81,
        "permissions": [
            "Reverse Transaction",
            "Issue Provisional Credit",
            "Open Dispute Case",
            "Close Dispute",
        ],
        "daily_budget": 150000.0,
        "current_usage": 28750.0,
        "request_count_today": 6,
        "policy_id": "POL-DISPUTE",
    },
    {
        "agent_id": "AGT-BENEFITS-01",
        "name": "Benefits Agent",
        "department": "Benefits",
        "description": "Evaluates purchase protection and card member benefit claims.",
        "status": "ACTIVE",
        "risk_level": "LOW",
        "trust_score": 0.88,
        "permissions": [
            "Approve Purchase Protection",
            "Approve Extended Warranty",
            "Deny Benefit Claim",
            "Request Documentation",
        ],
        "daily_budget": 80000.0,
        "current_usage": 12400.0,
        "request_count_today": 3,
        "policy_id": "POL-BENEFITS",
    },
    {
        "agent_id": "AGT-SERVICING-01",
        "name": "Servicing Agent",
        "department": "Servicing",
        "description": "Customer account servicing, fee waivers, and limit adjustments.",
        "status": "ACTIVE",
        "risk_level": "MEDIUM",
        "trust_score": 0.76,
        "permissions": [
            "Waive Annual Fee",
            "Adjust Credit Limit",
            "Update Contact Info",
            "Issue Statement Credit",
        ],
        "daily_budget": 60000.0,
        "current_usage": 18500.0,
        "request_count_today": 5,
        "policy_id": "POL-SERVICING",
    },
]

SAMPLE_HISTORY = [
    ("AGT-TRAVEL-01", "Travel Agent", "Rebook Flight", 18500.0, "APPROVED", 28.5, "LOW", "POL-TRAVEL"),
    ("AGT-DISPUTE-01", "Dispute Agent", "Reverse Transaction", 4500.0, "APPROVED", 32.0, "LOW", "POL-DISPUTE"),
    ("AGT-BENEFITS-01", "Benefits Agent", "Approve Purchase Protection", 2000.0, "APPROVED", 22.0, "LOW", "POL-BENEFITS"),
    ("AGT-SERVICING-01", "Servicing Agent", "Waive Annual Fee", 12500.0, "DENIED", 68.0, "HIGH", "POL-SERVICING"),
    ("AGT-DISPUTE-01", "Dispute Agent", "Issue Provisional Credit", 22000.0, "ESCALATED", 58.0, "MEDIUM", "POL-DISPUTE"),
    ("AGT-TRAVEL-01", "Travel Agent", "Upgrade Cabin", 42000.0, "ESCALATED", 61.0, "MEDIUM", "POL-TRAVEL"),
]


def seed_database(db: Session) -> None:
    if db.query(User).first() is not None:
        return

    user = User(
        email=settings.default_operator_email,
        full_name=settings.default_operator_name,
        hashed_password=hash_password(settings.default_operator_password),
        role="operator",
        is_active=True,
    )
    db.add(user)

    for p in POLICIES:
        db.add(
            Policy(
                policy_id=p["policy_id"],
                name=p["name"],
                description=p["description"],
                allowed_actions=json.dumps(p["allowed_actions"]),
                allowed_departments=json.dumps(p["allowed_departments"]),
                transaction_limit=p["transaction_limit"],
                daily_budget=p["daily_budget"],
                allowed_hours_start=p["allowed_hours_start"],
                allowed_hours_end=p["allowed_hours_end"],
                risk_threshold=p["risk_threshold"],
                escalate_above=p["escalate_above"],
                is_active=True,
                version=1,
            )
        )

    for a in AGENTS:
        db.add(
            Agent(
                agent_id=a["agent_id"],
                name=a["name"],
                department=a["department"],
                description=a["description"],
                status=a["status"],
                risk_level=a["risk_level"],
                trust_score=a["trust_score"],
                permissions=json.dumps(a["permissions"]),
                daily_budget=a["daily_budget"],
                current_usage=a["current_usage"],
                request_count_today=a["request_count_today"],
                policy_id=a["policy_id"],
            )
        )

    db.add(SystemState(id=1, kill_switch_active=False))

    now = datetime.now(UTC)
    for i, (aid, aname, action, amount, decision, score, level, pol) in enumerate(SAMPLE_HISTORY):
        ts = now - timedelta(hours=6 - i, minutes=i * 7)
        rid = f"REQ-SEED-{i+1:03d}"
        # Keep one escalated request open for the dashboard
        status = decision
        decided_at = ts
        if decision == "ESCALATED" and i == 4:
            status = "ESCALATED"
            decided_at = None

        req = AgentRequest(
            request_id=rid,
            agent_id=aid,
            agent_name=aname,
            action=action,
            amount=amount,
            currency="INR",
            customer_id=f"CUST-{2000 + i}",
            customer_risk="MEDIUM" if score > 50 else "LOW",
            status=status,
            decision=decision,
            risk_score=score,
            risk_level=level,
            policy_id=pol,
            reason=f"Seeded historical decision: {decision}",
            explanation=json.dumps(
                {
                    "summary": f"{decision}: Seeded historical evaluation",
                    "decision_rationale": f"Historical sample — {decision}",
                    "budget_status": "Within daily budget at time of evaluation",
                    "policy_matched": pol,
                    "risk_factors": [
                        f"Score {score}",
                        f"Level {level}",
                    ],
                    "why_approved": "Passed all gates" if decision == "APPROVED" else None,
                    "why_denied": "Risk or budget threshold" if decision == "DENIED" else None,
                    "why_escalated": "Requires human review" if decision == "ESCALATED" else None,
                }
            ),
            pipeline_steps=json.dumps(
                [
                    {"step": "Identity", "status": "PASS", "message": "Verified", "detail": None},
                    {"step": "Permission", "status": "PASS", "message": "Authorized", "detail": None},
                    {"step": "Budget", "status": "PASS", "message": "Within limits", "detail": None},
                    {
                        "step": "Risk",
                        "status": "WARN" if level != "LOW" else "PASS",
                        "message": f"Score {score}",
                        "detail": None,
                    },
                    {
                        "step": "Decision",
                        "status": "PASS" if decision == "APPROVED" else "WARN" if decision == "ESCALATED" else "FAIL",
                        "message": decision,
                        "detail": None,
                    },
                ]
            ),
            created_at=ts,
            decided_at=decided_at,
            latency_ms=12.0 + i * 3.5,
        )
        db.add(req)
        db.add(
            AuditLog(
                audit_id=f"AUD-SEED-{i+1:03d}",
                timestamp=ts,
                agent_id=aid,
                agent_name=aname,
                action=action,
                amount=amount,
                decision=decision,
                reason=f"Seeded historical decision: {decision}",
                risk_score=score,
                risk_level=level,
                policy_id=pol,
                request_id=rid,
                operator=None,
            )
        )

    db.commit()
