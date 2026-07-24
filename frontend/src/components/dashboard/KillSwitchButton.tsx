"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OctagonX, Power } from "lucide-react";

export function KillSwitchButton({
  active,
  loading,
  onToggle,
}: {
  active: boolean;
  loading?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Card className={active ? "border-danger/50 bg-danger/5" : ""}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <OctagonX className={`h-4 w-4 ${active ? "text-danger" : "text-muted"}`} />
            Emergency Kill Switch
          </CardTitle>
          <CardDescription>
            Instantly halt all registered financial agents across the control plane.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-muted">
            Status:{" "}
            <span className={active ? "text-danger font-semibold" : "text-success font-semibold"}>
              {active ? "ENGAGED" : "STANDBY"}
            </span>
          </div>
          <Button
            variant={active ? "success" : "danger"}
            disabled={loading}
            onClick={() => onToggle(!active)}
          >
            <Power className="h-4 w-4" />
            {active ? "Restore Agents" : "Activate Kill Switch"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
