"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { KillSwitchButton } from "@/components/dashboard/KillSwitchButton";
import { DecisionBadge, RiskBadge } from "@/components/risk/RiskBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import { pickRandomRequest } from "@/lib/simulator";
import type { AgentRequest, DashboardMetrics, KillSwitchState } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export default function DashboardPage() {
  const ready = useRequireAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [kill, setKill] = useState<KillSwitchState | null>(null);
  const [live, setLive] = useState<AgentRequest[]>([]);
  const [simulating, setSimulating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [m, k, reqs] = await Promise.all([
      api.metrics(),
      api.killSwitch(),
      api.requests({ limit: 12 }),
    ]);
    setMetrics(m);
    setKill(k);
    setLive(reqs);
  }, []);

  useEffect(() => {
    if (!ready) return;
    refresh().catch((e) => setError(e.message));
    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, 8000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  // Live request simulator
  useEffect(() => {
    if (!ready || !simulating || kill?.active) return;
    const tick = async () => {
      try {
        const sample = pickRandomRequest();
        const evaluated = await api.evaluate({
          agent_id: sample.agent_id,
          action: sample.action,
          amount: sample.amount,
          customer_risk: sample.customer_risk,
          customer_id: sample.customer_id,
        });
        setLive((prev) => [evaluated, ...prev].slice(0, 20));
        const m = await api.metrics();
        setMetrics(m);
      } catch {
        /* ignore transient sim errors */
      }
    };
    const delay = 6000 + Math.random() * 5000;
    const id = setTimeout(tick, delay);
    return () => clearTimeout(id);
  }, [ready, simulating, kill?.active, live.length]);

  async function toggleKill(next: boolean) {
    setBusy(true);
    try {
      const state = await api.setKillSwitch(
        next,
        next ? "Operator-initiated emergency stop from dashboard" : undefined
      );
      setKill(state);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kill switch failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !metrics || !kill) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted">
        Connecting to control plane…
      </div>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Real-time governance posture for financial AI agents"
      killSwitchActive={kill.active}
      killSwitchReason={kill.reason}
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <MetricsCards metrics={metrics} />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Live Requests</CardTitle>
                  <CardDescription>
                    Incoming agent actions evaluated through the Sentinel pipeline
                  </CardDescription>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSimulating((s) => !s)}
                  disabled={kill.active}
                >
                  {simulating ? "Pause simulation" : "Resume simulation"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {live.map((req) => (
                  <div
                    key={req.request_id}
                    className="animate-slide-in-right flex items-center justify-between gap-4 rounded-md border border-border bg-surface-raised/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{req.agent_name}</span>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted">{req.action}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted font-mono">
                        <span>{req.request_id}</span>
                        <span>{format(new Date(req.created_at), "HH:mm:ss")}</span>
                        {req.latency_ms != null ? <span>{req.latency_ms.toFixed(1)} ms</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm">{formatINR(req.amount)}</span>
                      {req.risk_level ? <RiskBadge level={req.risk_level} /> : null}
                      <DecisionBadge decision={req.decision ?? req.status} />
                    </div>
                  </div>
                ))}
                {!live.length ? (
                  <p className="py-8 text-center text-sm text-muted">Waiting for agent traffic…</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <KillSwitchButton active={kill.active} loading={busy} onToggle={toggleKill} />
            <Card>
              <CardHeader>
                <CardTitle>Decision mix</CardTitle>
                <CardDescription>Today&apos;s outcomes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Approved" value={metrics.approved_today} tone="text-success" />
                <Row label="Denied" value={metrics.denied_today} tone="text-danger" />
                <Row label="Escalated" value={metrics.escalated_today} tone="text-warning" />
                <Row label="Risk alerts" value={metrics.risk_alerts} tone="text-danger" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-raised px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-mono font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
