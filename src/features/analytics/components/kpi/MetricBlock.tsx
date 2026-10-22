/**
 * Metric block component for KPI tile details
 */

import { cn } from "@/lib/utils";

interface MetricBlockProps {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warning" | "success" | "info";
}

export function MetricBlock({
  label,
  value,
  tone = "default",
}: MetricBlockProps) {
  const toneClass =
    tone === "warning"
      ? "border-warning/70 bg-warning/60"
      : tone === "success"
        ? "border-success/70 bg-success/60"
        : tone === "info"
          ? "border-primary/70 bg-primary/60"
          : "border-border/60 bg-muted/40";

  return (
    <div className={cn("rounded-lg border p-3 transition", toneClass)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
