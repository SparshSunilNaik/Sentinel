"use client";

import { CheckCircle2, CircleAlert, CircleDashed, XCircle } from "lucide-react";
import type { PipelineStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  WARN: CircleAlert,
  SKIP: CircleDashed,
};

const COLORS = {
  PASS: "text-success border-success/30",
  FAIL: "text-danger border-danger/30",
  WARN: "text-warning border-warning/30",
  SKIP: "text-muted border-border",
};

export function DecisionTimeline({ steps }: { steps: PipelineStep[] | null | undefined }) {
  if (!steps?.length) {
    return <p className="text-xs text-muted">No pipeline steps recorded.</p>;
  }

  return (
    <ol className="space-y-3">
      {steps.map((step, idx) => {
        const Icon = ICONS[step.status];
        return (
          <li key={`${step.step}-${idx}`} className="relative flex gap-3">
            {idx < steps.length - 1 ? (
              <span className="absolute left-[11px] top-7 h-[calc(100%-8px)] w-px bg-border" />
            ) : null}
            <div
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-surface-raised",
                COLORS[step.status]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 rounded-md border border-border bg-surface-raised/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide">{step.step}</span>
                <span className={cn("text-[10px] font-semibold uppercase", COLORS[step.status])}>
                  {step.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">{step.message}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
