import { cn } from "@/lib/utils";
import type { DailyGridStats } from "@/features/scheduling/utils/hoursCalculation";
import { dayIso } from "@/features/scheduling/utils/gridIndexes";

interface WeekGridFooterProps {
  weekDays: Date[];
  dailyGridStats: Map<string, DailyGridStats>;
}

function coverageTone(ratio: number): string {
  if (ratio >= 1) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (ratio >= 0.5) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-destructive/15 text-destructive";
}

export function WeekGridFooter({
  weekDays,
  dailyGridStats,
}: WeekGridFooterProps) {
  return (
    <div
      className="grid grid-cols-8 border-t bg-muted/30 relative z-10"
      data-testid="schedule-grid-footer"
    >
      <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center">
        Labor / Coverage
      </div>
      {weekDays.map((day) => {
        const key = dayIso(day);
        const stats = dailyGridStats.get(key);
        const laborHours = stats?.laborHours ?? 0;
        const coveragePct = Math.round((stats?.coverageRatio ?? 1) * 100);

        return (
          <div
            key={`footer-${key}`}
            data-testid={`schedule-grid-footer-${key}`}
            className="border-l p-2 text-center"
          >
            <div className="text-xs font-medium">{laborHours}h</div>
            <span
              className={cn(
                "inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
                coverageTone(stats?.coverageRatio ?? 1),
              )}
            >
              {coveragePct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
