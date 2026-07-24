"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Explanation } from "@/lib/types";

export function ExplainabilityPanel({ explanation }: { explanation: Explanation | null | undefined }) {
  if (!explanation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explainability</CardTitle>
          <CardDescription>No explanation available for this request.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Explainability</CardTitle>
          <CardDescription>Why Sentinel made this decision</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Block title="Summary" body={explanation.summary} />
        <Block title="Decision rationale" body={explanation.decision_rationale} />
        <Block title="Policy matched" body={explanation.policy_matched} />
        <Block title="Budget status" body={explanation.budget_status} />

        {explanation.why_approved ? (
          <Block title="Why approved" body={explanation.why_approved} tone="success" />
        ) : null}
        {explanation.why_denied ? (
          <Block title="Why denied" body={explanation.why_denied} tone="danger" />
        ) : null}
        {explanation.why_escalated ? (
          <Block title="Why escalated" body={explanation.why_escalated} tone="warning" />
        ) : null}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Risk factors</div>
          {explanation.risk_factors.length ? (
            <ul className="space-y-1.5">
              {explanation.risk_factors.map((f) => (
                <li
                  key={f}
                  className="rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-foreground"
                >
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No risk factors computed (failed earlier gate).</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Block({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone?: "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-success/30 bg-success/5"
      : tone === "danger"
        ? "border-danger/30 bg-danger/5"
        : tone === "warning"
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-surface-raised";
  return (
    <div className={`rounded-md border px-3 py-2.5 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-foreground">{body}</div>
    </div>
  );
}
