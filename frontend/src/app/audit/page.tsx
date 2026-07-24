"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuditTable } from "@/components/audit/AuditTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { AuditLog, KillSwitchState } from "@/lib/types";

export default function AuditPage() {
  const ready = useRequireAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [kill, setKill] = useState<KillSwitchState | null>(null);
  const [q, setQ] = useState("");
  const [decision, setDecision] = useState("");

  useEffect(() => {
    if (!ready) return;
    const load = async () => {
      const [rows, k] = await Promise.all([
        api.audit({ q: q || undefined, decision: decision || undefined }),
        api.killSwitch(),
      ]);
      setLogs(rows);
      setKill(k);
    };
    load().catch(() => undefined);
  }, [ready, q, decision]);

  if (!ready) return null;

  return (
    <AppShell
      title="Audit Logs"
      subtitle="Immutable record of every governance decision"
      killSwitchActive={kill?.active}
      killSwitchReason={kill?.reason}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search agent, action, request ID, reason…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-2">
          {["", "APPROVED", "DENIED", "ESCALATED", "SYSTEM"].map((d) => (
            <Button
              key={d || "all"}
              size="sm"
              variant={decision === d ? "default" : "secondary"}
              onClick={() => setDecision(d)}
            >
              {d || "All"}
            </Button>
          ))}
        </div>
      </div>
      <AuditTable logs={logs} />
    </AppShell>
  );
}
