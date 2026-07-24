"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PolicyCard } from "@/components/policies/PolicyCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { KillSwitchState, Policy } from "@/lib/types";

export default function PoliciesPage() {
  const ready = useRequireAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [kill, setKill] = useState<KillSwitchState | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([api.policies(), api.killSwitch()]).then(([p, k]) => {
      setPolicies(p);
      setKill(k);
    });
  }, [ready]);

  async function onSave(id: string, patch: Partial<Policy>) {
    const updated = await api.updatePolicy(id, patch);
    setPolicies((prev) => prev.map((p) => (p.policy_id === id ? updated : p)));
  }

  if (!ready) return null;

  return (
    <AppShell
      title="Policies"
      subtitle="Governance rules applied immediately to future agent requests"
      killSwitchActive={kill?.active}
      killSwitchReason={kill?.reason}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {policies.map((policy) => (
          <PolicyCard key={policy.policy_id} policy={policy} onSave={onSave} />
        ))}
      </div>
    </AppShell>
  );
}
