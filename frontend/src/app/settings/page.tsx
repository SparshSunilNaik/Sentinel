"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KillSwitchButton } from "@/components/dashboard/KillSwitchButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { KillSwitchState, SettingsInfo, User } from "@/lib/types";

export default function SettingsPage() {
  const ready = useRequireAuth();
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [kill, setKill] = useState<KillSwitchState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    Promise.all([api.settings(), api.me(), api.killSwitch()]).then(([s, u, k]) => {
      setSettings(s);
      setUser(u);
      setKill(k);
    });
  }, [ready]);

  async function toggleKill(next: boolean) {
    setBusy(true);
    try {
      const state = await api.setKillSwitch(
        next,
        next ? "Emergency stop from Settings" : undefined
      );
      setKill(state);
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !settings || !user || !kill) return null;

  return (
    <AppShell
      title="Settings"
      subtitle="Control plane configuration and emergency controls"
      killSwitchActive={kill.active}
      killSwitchReason={kill.reason}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
            <CardDescription>Runtime configuration for this MVP deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Application" value={settings.app_name} />
            <Row label="Version" value={settings.app_version} />
            <Row label="Environment" value={settings.environment} />
            <Row label="Auth" value={settings.auth_enabled ? "JWT enabled" : "Disabled"} />
            <Row
              label="Enterprise APIs"
              value={settings.mock_enterprise_apis ? "Mocked" : "Live"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operator session</CardTitle>
            <CardDescription>Signed-in governance operator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={user.full_name} />
            <Row label="Email" value={user.email} />
            <Row label="Role" value={user.role} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <KillSwitchButton active={kill.active} loading={busy} onToggle={toggleKill} />
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-raised px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
