"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/requests", label: "Requests", icon: Activity },
  { href: "/audit", label: "Audit Logs", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-[#0d1219]/95">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 border border-accent/30">
          <Shield className="h-5 w-5 text-accent" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] text-foreground">SENTINEL</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted">Governance Plane</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-accent-soft text-accent border border-accent/20"
                  : "text-muted hover:bg-surface-raised hover:text-foreground border border-transparent"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <div className="rounded-md border border-border bg-surface-raised px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted">Environment</div>
          <div className="mt-1 text-xs font-medium text-foreground">Amex CodeStreet · MVP</div>
        </div>
      </div>
    </aside>
  );
}
