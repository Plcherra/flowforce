import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePerformanceOverview,
  type PerformanceGoalSummary,
  type PerformanceReviewEntry,
} from "@/hooks/usePerformanceOverview";
import { useRecognitions } from "@/hooks/useRecognitions";
import { useLeaderboardData } from "@/features/gamification/leaderboard/useLeaderboardData";
import type { LeaderboardPeriod } from "@/features/gamification/leaderboard/types";
import { useLeaderboardInsightsStore } from "@/stores/useLeaderboardInsights";
import { formatDistanceToNow } from "date-fns";
import { PerformanceHeader } from "./PerformanceHeader";
import { PerformanceKpiGrid, type PerformanceKpi } from "./PerformanceKpiGrid";
import {
  GoalProgressSection,
  type GoalSummaryCard,
} from "./GoalProgressSection";
import { XPTrendsSection, type XpTrendEntry } from "./XPTrendsSection";

function buildKpis({
  employees,
  reviews,
  recognitionsCount,
}: {
  employees: ReturnType<typeof usePerformanceOverview>["employees"];
  reviews: PerformanceReviewEntry[];
  recognitionsCount: number;
}): PerformanceKpi[] {
  const activeGoals = employees.reduce(
    (sum, employee) => sum + employee.activeGoals,
    0,
  );
  const completedGoals = employees.reduce(
    (sum, employee) => sum + employee.completedGoals,
    0,
  );
  const averageReviewScore =
    reviews.length > 0
      ? `${(reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length).toFixed(1)} / 5`
      : "No reviews";
  return [
    {
      id: "employees",
      label: "Employees tracked",
      value: `${employees.length}`,
      description: "Profiles with recent reviews",
    },
    {
      id: "goal-progress",
      label: "Active goals",
      value: `${activeGoals} active / ${completedGoals} completed`,
      description: "Across all employees",
    },
    {
      id: "review-score",
      label: "Avg. review score",
      value: averageReviewScore,
      description: "Weighted across cycles",
    },
    {
      id: "recognitions",
      label: "Recognitions",
      value: recognitionsCount.toString(),
      description: "Lookback period",
    },
  ];
}

function buildGoalCards(goals: PerformanceGoalSummary[]): GoalSummaryCard[] {
  return goals.slice(0, 6).map((goal) => ({
    id: goal.id,
    title: goal.title,
    status: goal.status,
    progress: Math.round(goal.progress ?? 0),
    targetDate: goal.targetCompletionDate,
  }));
}

function buildLeaderboardSnapshot(
  entries: ReturnType<typeof useLeaderboardData>["entries"],
): XpTrendEntry[] {
  return entries.slice(0, 5).map((entry) => ({
    id: entry.employeeId,
    name: entry.fullName,
    xp: entry.xp.total,
    department: entry.department?.name ?? null,
  }));
}

function LatestReviewsCard({
  reviews,
  loading,
}: {
  reviews: PerformanceReviewEntry[];
  loading: boolean;
}) {
  if (loading && reviews.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && reviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Recent reviews</CardTitle>
          <CardDescription>No review activity recorded.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Recent reviews</CardTitle>
        <CardDescription>Latest submissions across employees</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={undefined} alt={review.employeeName} />
              <AvatarFallback>
                {review.employeeName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold">{review.employeeName}</p>
              <p className="text-xs text-muted-foreground">
                {review.summary ?? "No summary provided"} ·{" "}
                {new Date(review.date).toLocaleDateString()}
              </p>
            </div>
            <span className="text-sm font-semibold">
              {review.score?.toFixed(1) ?? "n/a"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PerformancePage() {
  const {
    employees,
    goals,
    reviews,
    loading: performanceLoading,
    error: performanceError,
    refetch,
  } = usePerformanceOverview();
  const {
    recognitions,
    loading: recognitionsLoading,
    error: recognitionsError,
    refresh: refreshRecognitions,
  } = useRecognitions();
  const leaderboardPeriod: LeaderboardPeriod = "monthly";
  const {
    entries,
    analytics,
    loading: leaderboardLoading,
    error: leaderboardError,
    refresh: refreshLeaderboard,
  } = useLeaderboardData(leaderboardPeriod);
  const { lastUpdated } = useLeaderboardInsightsStore((state) => ({
    lastUpdated: state.lastUpdated,
  }));

  const kpis = buildKpis({
    employees,
    reviews,
    recognitionsCount: recognitions.length,
  });
  const goalCards = buildGoalCards(goals);
  const xpSnapshot = buildLeaderboardSnapshot(entries);
  const xpBySource = analytics?.xpBySource ?? {
    tasks: 0,
    goals: 0,
    recognitions: 0,
    training: 0,
  };
  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })
    : analytics?.updatedAt
      ? formatDistanceToNow(new Date(analytics.updatedAt), { addSuffix: true })
      : null;

  const combinedLoading =
    performanceLoading || recognitionsLoading || leaderboardLoading;

  const handleRefresh = () => {
    refetch?.();
    refreshRecognitions?.();
    refreshLeaderboard?.();
  };

  const combinedError =
    performanceError ?? recognitionsError ?? null;
  const leaderboardWarning = leaderboardError ?? null;

  return (
    <div className="space-y-6 p-6">
      <PerformanceHeader
        loading={combinedLoading}
        onRefresh={handleRefresh}
        lastUpdatedLabel={lastUpdatedLabel}
      />

      {combinedError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load some performance data</AlertTitle>
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      )}

      {leaderboardWarning && !combinedError && (
        <Alert>
          <AlertTitle>Leaderboard data unavailable</AlertTitle>
          <AlertDescription>
            Performance reviews loaded, but XP leaderboard sync is not ready yet.
            Apply the latest Supabase migrations or refresh after managers sync
            the board.
          </AlertDescription>
        </Alert>
      )}

      <PerformanceKpiGrid metrics={kpis} loading={performanceLoading} />

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <GoalProgressSection goals={goalCards} loading={performanceLoading} />
        <XPTrendsSection
          xpBySource={xpBySource as unknown as Record<string, number>}
          leaderboard={xpSnapshot}
          loading={leaderboardLoading}
        />
      </div>

      <LatestReviewsCard reviews={reviews} loading={performanceLoading} />
    </div>
  );
}

export default PerformancePage;
