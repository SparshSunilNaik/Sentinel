"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, StatusIndicator } from "@/components/risk/RiskBadge";
import type { Agent } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export function AgentCard({ agent }: { agent: Agent }) {
  const usedPct = Math.min(100, Math.round((agent.current_usage / agent.daily_budget) * 100));

  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{agent.name}</CardTitle>
          <CardDescription>{agent.department} · {agent.agent_id}</CardDescription>
        </div>
        <StatusIndicator status={agent.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted leading-relaxed">{agent.description}</p>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Risk level</span>
          <RiskBadge level={agent.risk_level} />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Trust score</span>
          <span className="font-mono text-foreground">{(agent.trust_score * 100).toFixed(0)}%</span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted">Daily budget</span>
            <span className="font-mono">
              {formatINR(agent.current_usage)} / {formatINR(agent.daily_budget)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised border border-border">
            <div
              className={`h-full rounded-full transition-all ${
                usedPct > 80 ? "bg-danger" : usedPct > 55 ? "bg-warning" : "bg-accent"
              }`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Permissions</div>
          <div className="flex flex-wrap gap-1.5">
            {agent.permissions.map((p) => (
              <span
                key={p}
                className="rounded border border-border bg-surface-raised px-2 py-0.5 text-[11px] text-muted"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span>Policy {agent.policy_id}</span>
          <span>{agent.request_count_today} requests today</span>
        </div>
      </CardContent>
    </Card>
  );
}
