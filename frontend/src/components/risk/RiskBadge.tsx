import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

export function RiskBadge({ level }: { level: RiskLevel | string | null | undefined }) {
  const l = (level ?? "LOW").toUpperCase();
  const tone = l === "HIGH" ? "danger" : l === "MEDIUM" ? "warning" : "success";
  const tones = {
    danger: "bg-danger/10 text-danger border-danger/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    success: "bg-success/10 text-success border-success/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase",
        tones[tone]
      )}
    >
      {l}
    </span>
  );
}

export function StatusIndicator({ status }: { status: string }) {
  const s = status.toUpperCase();
  const color =
    s === "ACTIVE"
      ? "bg-success"
      : s === "STOPPED"
        ? "bg-danger"
        : s === "PAUSED" || s === "DEGRADED"
          ? "bg-warning"
          : "bg-muted";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", color, s === "ACTIVE" && "animate-pulse-dot")} />
      {s}
    </span>
  );
}

export function DecisionBadge({ decision }: { decision: string | null | undefined }) {
  const d = (decision ?? "PENDING").toUpperCase();
  const tone =
    d === "APPROVED"
      ? "success"
      : d === "DENIED" || d === "BLOCKED"
        ? "danger"
        : d === "ESCALATED"
          ? "warning"
          : "neutral";
  const map = {
    success: "bg-success/10 text-success border-success/30",
    danger: "bg-danger/10 text-danger border-danger/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    neutral: "bg-surface-raised text-muted border-border",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase",
        map[tone]
      )}
    >
      {d}
    </span>
  );
}
