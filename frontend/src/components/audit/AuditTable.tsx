"use client";

import { format } from "date-fns";
import { DecisionBadge, RiskBadge } from "@/components/risk/RiskBadge";
import type { AuditLog } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export function AuditTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-surface-raised text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Decision</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Policy</th>
              <th className="px-4 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.audit_id} className="border-t border-border hover:bg-surface-raised/40">
                <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                  {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium">{log.agent_name}</div>
                  <div className="font-mono text-[10px] text-muted">{log.agent_id}</div>
                </td>
                <td className="px-4 py-3 text-xs">{log.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatINR(log.amount)}</td>
                <td className="px-4 py-3">
                  <DecisionBadge decision={log.decision} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={log.risk_level} />
                    <span className="font-mono text-[11px] text-muted">{log.risk_score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted">{log.policy_id}</td>
                <td className="px-4 py-3 text-xs text-muted max-w-xs truncate" title={log.reason}>
                  {log.reason}
                </td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                  No audit records match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
