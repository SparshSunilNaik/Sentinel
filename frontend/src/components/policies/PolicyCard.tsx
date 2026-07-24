"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { Policy } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export function PolicyCard({
  policy,
  onSave,
}: {
  policy: Policy;
  onSave: (id: string, patch: Partial<Policy>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    transaction_limit: policy.transaction_limit,
    daily_budget: policy.daily_budget,
    risk_threshold: policy.risk_threshold,
    escalate_above: policy.escalate_above,
    allowed_hours_start: policy.allowed_hours_start,
    allowed_hours_end: policy.allowed_hours_end,
  });

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(policy.policy_id, form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{policy.name}</CardTitle>
          <CardDescription>
            {policy.policy_id} · v{policy.version} · {policy.is_active ? "Active" : "Inactive"}
          </CardDescription>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing((e) => !e)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted leading-relaxed">{policy.description}</p>

        {!editing ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Txn limit" value={formatINR(policy.transaction_limit)} />
            <Stat label="Daily budget" value={formatINR(policy.daily_budget)} />
            <Stat label="Risk deny ≥" value={String(policy.risk_threshold)} />
            <Stat label="Escalate ≥" value={String(policy.escalate_above)} />
            <Stat
              label="Allowed hours"
              value={`${policy.allowed_hours_start.toString().padStart(2, "0")}:00–${policy.allowed_hours_end
                .toString()
                .padStart(2, "0")}:00 UTC`}
            />
            <Stat label="Departments" value={policy.allowed_departments.join(", ")} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["transaction_limit", "Txn limit"],
                ["daily_budget", "Daily budget"],
                ["risk_threshold", "Risk deny ≥"],
                ["escalate_above", "Escalate ≥"],
                ["allowed_hours_start", "Hours start"],
                ["allowed_hours_end", "Hours end"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type="number"
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
            <div className="col-span-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving…" : "Save policy (applies immediately)"}
              </Button>
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Allowed actions</div>
          <div className="flex flex-wrap gap-1.5">
            {policy.allowed_actions.map((a) => (
              <span
                key={a}
                className="rounded border border-border bg-surface-raised px-2 py-0.5 text-[11px] text-muted"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
