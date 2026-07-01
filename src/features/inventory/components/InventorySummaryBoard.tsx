import React from "react";
import { Activity, CalendarDays, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const summaryMetrics = [
  { label: "Stock accuracy", value: "97.4%", trend: "+0.8%", icon: Target },
  {
    label: "Prep readiness",
    value: "82%",
    trend: "Next prep in 3h",
    icon: CalendarDays,
  },
  {
    label: "Waste recovered",
    value: "$1.2k",
    trend: "Last 7 days",
    icon: Activity,
  },
];

interface InventorySummaryBoardProps {
  variant?: "compact" | "full";
}

export function InventorySummaryBoard({
  variant = "full",
}: InventorySummaryBoardProps) {
  if (variant === "compact") {
    return (
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
          >
            <metric.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {metric.label}
              </p>
              <p className="text-sm font-semibold">
                {metric.value}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {metric.trend}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm")}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Live snapshot
        </p>
        <h3 className="text-lg font-semibold">Inventory health</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-border/70 bg-background p-3"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <metric.icon className="h-4 w-4" />
              {metric.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-xl font-semibold">{metric.value}</p>
              <span className="text-xs text-muted-foreground">
                {metric.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
