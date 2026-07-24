"use client";

import { AlertTriangle } from "lucide-react";

export function KillSwitchBanner({ reason }: { reason?: string | null }) {
  return (
    <div className="flex items-center justify-center gap-3 bg-danger px-4 py-2.5 text-sm font-semibold text-[#1a0505]">
      <AlertTriangle className="h-4 w-4" />
      <span>EMERGENCY KILL SWITCH ACTIVE</span>
      <span className="font-normal opacity-80">
        — All agents stopped. {reason ?? "No new requests can execute."}
      </span>
    </div>
  );
}
