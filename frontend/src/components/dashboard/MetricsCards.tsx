"use client";

import { Activity, AlertTriangle, Clock, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/types";
import { formatINR, formatLatency } from "@/lib/utils";

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card className="animate-fade-up">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
            {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
          </div>
          <div className={`rounded-md border border-border bg-surface-raised p-2 ${accent ?? "text-accent"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <Metric
        label="Active Agents"
        value={`${metrics.active_agents}/${metrics.total_agents}`}
        hint="Registered & running"
        icon={Users}
      />
      <Metric
        label="Pending Requests"
        value={metrics.pending_requests}
        hint="Awaiting decision / approval"
        icon={Activity}
        accent="text-warning"
      />
      <Metric
        label="Today's Decisions"
        value={metrics.todays_decisions}
        hint={`${metrics.approved_today} approved · ${metrics.denied_today} denied`}
        icon={ShieldCheck}
        accent="text-success"
      />
      <Metric
        label="Avg Policy Latency"
        value={formatLatency(metrics.average_policy_latency_ms)}
        hint="End-to-end evaluation"
        icon={Clock}
      />
      <Metric
        label="Risk Alerts"
        value={metrics.risk_alerts}
        hint="High-risk evaluations today"
        icon={AlertTriangle}
        accent="text-danger"
      />
      <Metric
        label="Spend Today"
        value={formatINR(metrics.total_spend_today)}
        hint={`${metrics.budget_utilization_pct}% budget used`}
        icon={Activity}
      />
    </div>
  );
}
