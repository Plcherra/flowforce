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
      ? "border-amber-300/70 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10"
      : tone === "success"
        ? "border-emerald-300/70 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10"
        : tone === "info"
          ? "border-sky-300/70 bg-sky-50/60 dark:border-sky-500/30 dark:bg-sky-500/10"
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
