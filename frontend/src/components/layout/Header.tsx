"use client";

import { LogOut, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/auth";

export function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface/60 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="text-xs text-muted mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted">
          <Radio className="h-3.5 w-3.5 text-success animate-pulse-dot" />
          Control plane live
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
