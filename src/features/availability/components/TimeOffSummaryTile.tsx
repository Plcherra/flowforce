import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

interface TimeOffSummaryTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warning";
}

export function TimeOffSummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: TimeOffSummaryTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 shadow-sm transition",
        tone === "warning" ? "border-warning/40 bg-warning-muted" : "bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
        {label}
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "warning" ? "text-warning" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
