"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { KillSwitchBanner } from "@/components/dashboard/KillSwitchBanner";

export function AppShell({
  title,
  subtitle,
  children,
  killSwitchActive,
  killSwitchReason,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  killSwitchActive?: boolean;
  killSwitchReason?: string | null;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {killSwitchActive ? <KillSwitchBanner reason={killSwitchReason} /> : null}
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">{children}</main>
      </div>
    </div>
  );
}
