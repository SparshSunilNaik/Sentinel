from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

DecisionType = Literal["APPROVED", "DENIED", "ESCALATED"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]
AgentStatus = Literal["ACTIVE", "PAUSED", "STOPPED", "DEGRADED"]
RequestStatus = Literal["PENDING", "APPROVED", "DENIED", "ESCALATED", "BLOCKED"]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agent_id: str
    name: str
    department: str
    description: str
    status: str
    risk_level: str
    trust_score: float
    permissions: list[str]
    daily_budget: float
    current_usage: float
    request_count_today: int
    policy_id: str
    budget_remaining: float | None = None
    updated_at: datetime | None = None


class AgentUpdate(BaseModel):
    status: AgentStatus | None = None
    daily_budget: float | None = None
    permissions: list[str] | None = None
    trust_score: float | None = Field(default=None, ge=0, le=1)


class PolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    policy_id: str
    name: str
    description: str
    allowed_actions: list[str]
    allowed_departments: list[str]
    transaction_limit: float
    daily_budget: float
    allowed_hours_start: int
    allowed_hours_end: int
    risk_threshold: float
    escalate_above: float
    is_active: bool
    version: int
    updated_at: datetime | None = None


class PolicyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    allowed_actions: list[str] | None = None
    allowed_departments: list[str] | None = None
    transaction_limit: float | None = None
    daily_budget: float | None = None
    allowed_hours_start: int | None = Field(default=None, ge=0, le=23)
    allowed_hours_end: int | None = Field(default=None, ge=0, le=23)
    risk_threshold: float | None = Field(default=None, ge=0, le=100)
    escalate_above: float | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None


class PipelineStep(BaseModel):
    step: str
    status: Literal["PASS", "FAIL", "WARN", "SKIP"]
    message: str
    detail: dict[str, Any] | None = None


class RiskBreakdown(BaseModel):
    amount_factor: float
    trust_factor: float
    budget_factor: float
    frequency_factor: float
    customer_factor: float
    score: float
    level: RiskLevel


class Explanation(BaseModel):
    summary: str
    decision_rationale: str
    budget_status: str
    policy_matched: str
    risk_factors: list[str]
    why_approved: str | None = None
    why_denied: str | None = None
    why_escalated: str | None = None


class RequestCreate(BaseModel):
    agent_id: str
    action: str
    amount: float = Field(gt=0)
    currency: str = "INR"
    customer_id: str = "CUST-1001"
    customer_risk: RiskLevel = "LOW"


class RequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    request_id: str
    agent_id: str
    agent_name: str
    action: str
    amount: float
    currency: str
    customer_id: str
    customer_risk: str
    status: str
    decision: str | None
    risk_score: float | None
    risk_level: str | None
    policy_id: str | None
    reason: str | None
    explanation: Explanation | None = None
    pipeline_steps: list[PipelineStep] | None = None
    created_at: datetime
    decided_at: datetime | None
    latency_ms: float | None


class ApprovalAction(BaseModel):
    approve: bool
    note: str | None = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    audit_id: str
    timestamp: datetime
    agent_id: str
    agent_name: str
    action: str
    amount: float
    decision: str
    reason: str
    risk_score: float
    risk_level: str
    policy_id: str
    request_id: str
    operator: str | None


class KillSwitchState(BaseModel):
    active: bool
    reason: str | None = None
    activated_by: str | None = None
    activated_at: datetime | None = None


class KillSwitchRequest(BaseModel):
    active: bool
    reason: str | None = None


class DashboardMetrics(BaseModel):
    active_agents: int
    total_agents: int
    pending_requests: int
    todays_decisions: int
    approved_today: int
    denied_today: int
    escalated_today: int
    average_policy_latency_ms: float
    risk_alerts: int
    kill_switch_active: bool
    total_spend_today: float
    budget_utilization_pct: float


class SettingsOut(BaseModel):
    app_name: str
    app_version: str
    environment: str = "mvp"
    auth_enabled: bool = True
    mock_enterprise_apis: bool = True
    operator_email: str
