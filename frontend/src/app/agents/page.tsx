"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AgentCard } from "@/components/agents/AgentCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { Agent, KillSwitchState } from "@/lib/types";

export default function AgentsPage() {
  const ready = useRequireAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [kill, setKill] = useState<KillSwitchState | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([api.agents(), api.killSwitch()]).then(([a, k]) => {
      setAgents(a);
      setKill(k);
    });
  }, [ready]);

  if (!ready) return null;

  return (
    <AppShell
      title="Agents"
      subtitle="Registered financial AI agents and their governance posture"
      killSwitchActive={kill?.active}
      killSwitchReason={kill?.reason}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard key={agent.agent_id} agent={agent} />
        ))}
      </div>
    </AppShell>
  );
}
