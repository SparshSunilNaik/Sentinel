import { clearToken, getToken } from "@/lib/auth";
import type {
  Agent,
  AgentRequest,
  AuditLog,
  DashboardMetrics,
  KillSwitchState,
  Policy,
  SettingsInfo,
  User,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/auth/me"),

  metrics: () => request<DashboardMetrics>("/dashboard/metrics"),

  agents: () => request<Agent[]>("/agents"),
  updateAgent: (id: string, body: Partial<Agent>) =>
    request<Agent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  policies: () => request<Policy[]>("/policies"),
  updatePolicy: (id: string, body: Partial<Policy>) =>
    request<Policy>(`/policies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  requests: (params?: { status?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<AgentRequest[]>(`/requests${suffix}`);
  },
  getRequest: (id: string) => request<AgentRequest>(`/requests/${id}`),
  evaluate: (body: {
    agent_id: string;
    action: string;
    amount: number;
    customer_id?: string;
    customer_risk?: string;
  }) =>
    request<AgentRequest>("/requests/evaluate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resolve: (id: string, approve: boolean, note?: string) =>
    request<AgentRequest>(`/requests/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ approve, note }),
    }),

  audit: (params?: { q?: string; decision?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.decision) qs.set("decision", params.decision);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<AuditLog[]>(`/audit${suffix}`);
  },

  killSwitch: () => request<KillSwitchState>("/kill-switch"),
  setKillSwitch: (active: boolean, reason?: string) =>
    request<KillSwitchState>("/kill-switch", {
      method: "POST",
      body: JSON.stringify({ active, reason }),
    }),

  settings: () => request<SettingsInfo>("/settings"),
};

export { ApiError };
