export type Decision = "APPROVED" | "DENIED" | "ESCALATED" | "SYSTEM";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AgentStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "DEGRADED";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  department: string;
  description: string;
  status: AgentStatus | string;
  risk_level: RiskLevel | string;
  trust_score: number;
  permissions: string[];
  daily_budget: number;
  current_usage: number;
  request_count_today: number;
  policy_id: string;
  budget_remaining?: number;
  updated_at?: string;
}

export interface Policy {
  policy_id: string;
  name: string;
  description: string;
  allowed_actions: string[];
  allowed_departments: string[];
  transaction_limit: number;
  daily_budget: number;
  allowed_hours_start: number;
  allowed_hours_end: number;
  risk_threshold: number;
  escalate_above: number;
  is_active: boolean;
  version: number;
  updated_at?: string;
}

export interface PipelineStep {
  step: string;
  status: "PASS" | "FAIL" | "WARN" | "SKIP";
  message: string;
  detail?: Record<string, unknown> | null;
}

export interface Explanation {
  summary: string;
  decision_rationale: string;
  budget_status: string;
  policy_matched: string;
  risk_factors: string[];
  why_approved?: string | null;
  why_denied?: string | null;
  why_escalated?: string | null;
}

export interface AgentRequest {
  request_id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  amount: number;
  currency: string;
  customer_id: string;
  customer_risk: string;
  status: string;
  decision: string | null;
  risk_score: number | null;
  risk_level: string | null;
  policy_id: string | null;
  reason: string | null;
  explanation: Explanation | null;
  pipeline_steps: PipelineStep[] | null;
  created_at: string;
  decided_at: string | null;
  latency_ms: number | null;
}

export interface AuditLog {
  audit_id: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  action: string;
  amount: number;
  decision: string;
  reason: string;
  risk_score: number;
  risk_level: string;
  policy_id: string;
  request_id: string;
  operator: string | null;
}

export interface DashboardMetrics {
  active_agents: number;
  total_agents: number;
  pending_requests: number;
  todays_decisions: number;
  approved_today: number;
  denied_today: number;
  escalated_today: number;
  average_policy_latency_ms: number;
  risk_alerts: number;
  kill_switch_active: boolean;
  total_spend_today: number;
  budget_utilization_pct: number;
}

export interface KillSwitchState {
  active: boolean;
  reason: string | null;
  activated_by: string | null;
  activated_at: string | null;
}

export interface SettingsInfo {
  app_name: string;
  app_version: string;
  environment: string;
  auth_enabled: boolean;
  mock_enterprise_apis: boolean;
  operator_email: string;
}
