import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LeaderboardPeriod } from "@/features/gamification/leaderboard/types";
import { useLeaderboardData } from "@/features/gamification/leaderboard/useLeaderboardData";
import { formatDistanceToNow } from "date-fns";
import { LeaderboardHeader } from "./LeaderboardHeader";
import { XPProgressCard } from "./XPProgressCard";
import { LeaderboardTable } from "./LeaderboardTable";

const LEADERBOARD_MILESTONES = [
  {
    label: "Engagement Tier I",
    xpRequired: 15000,
    description: "Unlocks automated challenges for the org.",
  },
  {
    label: "Engagement Tier II",
    xpRequired: 30000,
    description: "Copilot launches recognition campaigns weekly.",
  },
  {
    label: "Elite Tier",
    xpRequired: 60000,
    description: "Company qualifies for quarterly XP accelerators.",
  },
  {
    label: "Legend Tier",
    xpRequired: 100000,
    description: "All squads eligible for custom rewards.",
  },
];

function deriveMilestones(totalXp: number) {
  const nextMilestone = LEADERBOARD_MILESTONES.find(
    (milestone) => totalXp < milestone.xpRequired,
  ) ?? {
    label: "Custom milestone",
    xpRequired: Math.max(totalXp + 5000, 1000),
    description: "Set a new challenge to keep XP momentum high.",
  };
  const previousMilestone =
    [...LEADERBOARD_MILESTONES]
      .reverse()
      .find((milestone) => milestone.xpRequired <= totalXp) ?? undefined;
  return { nextMilestone, previousMilestone };
}

function LeaderboardStats({
  participantCount,
  averageXp,
  topDepartment,
}: {
  participantCount: number;
  averageXp: number;
  topDepartment?: {
    name: string | null;
    participantCount: number;
    totalXp: number;
  } | null;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Analytics</CardTitle>
        <CardDescription>Snapshot for the current period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Participants</p>
          <p className="text-lg font-semibold">{participantCount}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Average XP</p>
          <p className="text-lg font-semibold">{averageXp.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Top department</p>
          <p className="text-sm font-semibold">
            {topDepartment?.name ?? "None"} ·{" "}
            {topDepartment?.participantCount ?? 0} participant
            {topDepartment && topDepartment.participantCount === 1 ? "" : "s"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("monthly");
  const { entries, analytics, loading, error, refresh } =
    useLeaderboardData(period);
  const totalXp = entries.reduce((sum, entry) => sum + entry.xp.total, 0);
  const { nextMilestone, previousMilestone } = deriveMilestones(totalXp);
  const lastUpdatedLabel = analytics?.updatedAt
    ? formatDistanceToNow(new Date(analytics.updatedAt), { addSuffix: true })
    : null;

  return (
    <div className="space-y-6 p-6">
      <LeaderboardHeader
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={() => refresh?.()}
        loading={loading}
        lastUpdatedLabel={lastUpdatedLabel}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load leaderboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <LeaderboardTable entries={entries} loading={loading} />
        <div className="space-y-6">
          <XPProgressCard
            currentXp={totalXp}
            nextMilestone={nextMilestone}
            previousMilestone={previousMilestone}
            loading={loading}
          />
          <LeaderboardStats
            participantCount={analytics?.participantCount ?? 0}
            averageXp={analytics?.averageXp ?? 0}
            topDepartment={analytics?.topDepartment ?? null}
          />
        </div>
      </div>
    </div>
  );
}

export default LeaderboardPage;
