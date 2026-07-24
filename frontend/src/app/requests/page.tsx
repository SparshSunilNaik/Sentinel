"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { DecisionTimeline } from "@/components/requests/DecisionTimeline";
import { ExplainabilityPanel } from "@/components/requests/ExplainabilityPanel";
import { DecisionBadge, RiskBadge } from "@/components/risk/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { AgentRequest, KillSwitchState } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export default function RequestsPage() {
  const ready = useRequireAuth();
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [selected, setSelected] = useState<AgentRequest | null>(null);
  const [kill, setKill] = useState<KillSwitchState | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [reqs, k] = await Promise.all([
      api.requests({ status: filter || undefined, limit: 50 }),
      api.killSwitch(),
    ]);
    setRequests(reqs);
    setKill(k);
    setSelected((prev) => {
      if (!prev) return reqs[0] ?? null;
      return reqs.find((r) => r.request_id === prev.request_id) ?? reqs[0] ?? null;
    });
  }, [filter]);

  useEffect(() => {
    if (!ready) return;
    load().catch(() => undefined);
    const id = setInterval(() => load().catch(() => undefined), 10000);
    return () => clearInterval(id);
  }, [ready, load]);

  async function resolve(approve: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.resolve(
        selected.request_id,
        approve,
        approve ? "Operator approved after review" : "Operator denied after review"
      );
      setSelected(updated);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <AppShell
      title="Requests"
      subtitle="Inspect pipeline evaluation, risk, and human approvals"
      killSwitchActive={kill?.active}
      killSwitchReason={kill?.reason}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "ESCALATED", "APPROVED", "DENIED", "BLOCKED"].map((f) => (
          <Button
            key={f || "all"}
            size="sm"
            variant={filter === f ? "default" : "secondary"}
            onClick={() => setFilter(f)}
          >
            {f || "All"}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Request queue</CardTitle>
            <CardDescription>{requests.length} recent evaluations</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto scrollbar-thin">
            {requests.map((req) => (
              <button
                key={req.request_id}
                type="button"
                onClick={() => setSelected(req)}
                className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
                  selected?.request_id === req.request_id
                    ? "border-accent/40 bg-accent-soft"
                    : "border-border bg-surface-raised/60 hover:bg-surface-raised"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{req.agent_name}</span>
                  <DecisionBadge decision={req.decision ?? req.status} />
                </div>
                <div className="mt-1 text-xs text-muted">
                  {req.action} · {formatINR(req.amount)}
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted">
                  {format(new Date(req.created_at), "HH:mm:ss")} · {req.request_id}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="xl:col-span-3 space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{selected.action}</CardTitle>
                    <CardDescription>
                      {selected.agent_name} · {selected.request_id} ·{" "}
                      {format(new Date(selected.created_at), "PPpp")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.risk_level ? <RiskBadge level={selected.risk_level} /> : null}
                    <DecisionBadge decision={selected.decision ?? selected.status} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3 text-xs">
                  <Meta label="Amount" value={formatINR(selected.amount)} />
                  <Meta label="Risk score" value={selected.risk_score?.toFixed(1) ?? "—"} />
                  <Meta label="Latency" value={selected.latency_ms != null ? `${selected.latency_ms} ms` : "—"} />
                  <Meta label="Customer" value={selected.customer_id} />
                  <Meta label="Customer risk" value={selected.customer_risk} />
                  <Meta label="Policy" value={selected.policy_id ?? "—"} />
                </CardContent>
              </Card>

              {selected.status === "ESCALATED" ? (
                <Card className="border-warning/40">
                  <CardHeader>
                    <CardTitle>Human approval required</CardTitle>
                    <CardDescription>{selected.reason}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Button disabled={busy || kill?.active} onClick={() => resolve(true)}>
                      Approve
                    </Button>
                    <Button variant="danger" disabled={busy || kill?.active} onClick={() => resolve(false)}>
                      Deny
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Decision pipeline</CardTitle>
                    <CardDescription>Identity → Permission → Budget → Risk → Decision</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DecisionTimeline steps={selected.pipeline_steps} />
                  </CardContent>
                </Card>
                <ExplainabilityPanel explanation={selected.explanation} />
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted">
                Select a request to inspect evaluation details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
