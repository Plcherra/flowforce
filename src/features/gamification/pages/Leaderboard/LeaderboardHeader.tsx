import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw } from "lucide-react";
import type { LeaderboardPeriod } from "@/features/gamification/leaderboard/types";

interface LeaderboardHeaderProps {
  period: LeaderboardPeriod;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  onRefresh?: () => void;
  loading: boolean;
  lastUpdatedLabel?: string | null;
}

const PERIOD_OPTIONS: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export function LeaderboardHeader({
  period,
  onPeriodChange,
  onRefresh,
  loading,
  lastUpdatedLabel,
}: LeaderboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Gamification
        </p>
        <h1 className="mt-1 text-3xl font-bold">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monitor XP totals, badge tiers, and top contributors across your
          workforce.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(value) => {
            if (value) onPeriodChange(value as LeaderboardPeriod);
          }}
        >
          {PERIOD_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="text-xs font-semibold uppercase"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            {lastUpdatedLabel ? `Synced ${lastUpdatedLabel}` : "Awaiting sync"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}

export default LeaderboardHeader;
