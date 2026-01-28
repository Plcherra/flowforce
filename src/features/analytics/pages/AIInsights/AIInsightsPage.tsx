import { Suspense, lazy } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/resources/LoadingSpinner";
import { XPBar } from "@/features/gamification/components";
import { usePerformanceOverview } from "@/hooks/usePerformanceOverview";
import type {
  PerformanceDataset,
  PerformanceGoalReview,
  PerformanceRadarMetric,
} from "@/services/performance/performanceTypes";
import { formatDistanceToNow } from "date-fns";
import { InsightsHeader } from "./InsightsHeader";
import { InsightSummaryCards, type SummaryMetric } from "./InsightSummaryCards";
import {
  RecommendationsPanel,
  type Recommendation,
} from "./RecommendationsPanel";

const AIInsightsPanel = lazy(() => import("@/components/ai/AIInsightsPanel"));
const AIChatAssistant = lazy(() => import("@/components/ai/AIChatAssistant"));
const PerformanceRadarChart = lazy(
  () => import("@/components/ai/PerformanceRadarChart"),
);
const ScenarioSimulator = lazy(
  () => import("@/components/ai/ScenarioSimulator"),
);
const AIQuickActions = lazy(() => import("@/components/ai/AIQuickActions"));
const EngagementOverview = lazy(
  () => import("@/components/company-updates/EngagementOverview"),
);

const PanelFallback = () => (
  <Card className="h-full">
    <CardContent className="flex h-48 items-center justify-center">
      <LoadingSpinner />
    </CardContent>
  </Card>
);

type PredictionRow = {
  id: string;
  metric: string;
  status: string;
  progress: number;
  forecast: string;
  confidence: number | null;
  trendClass: string;
  reviewDate: string | null;
};

type Trajectory = {
  totalXp: number;
  nextMilestone: { label: string; xpRequired: number; description?: string };
  previousMilestone?: {
    label: string;
    xpRequired: number;
    description?: string;
  };
};

function PredictionTable({
  rows,
  loading,
}: {
  rows: PredictionRow[];
  loading: boolean;
}) {
  if (loading && rows.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Forecasted Goals</CardTitle>
          <CardDescription>Crunching review history…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl border bg-muted/30 p-3"
            >
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader>
          <CardTitle>Forecasted Goals</CardTitle>
          <CardDescription>No goal reviews are available yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Once performance reviews sync from Supabase, AI will highlight
          potential risks and trajectory guidance here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Forecasted Goals</CardTitle>
        <CardDescription>
          Top opportunities identified by AI this week.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Goal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Forecast</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Reviewed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.metric}</TableCell>
                <TableCell className="capitalize">{row.status}</TableCell>
                <TableCell>
                  <span className={`font-semibold ${row.trendClass}`}>
                    {Math.round(row.progress)}%
                  </span>
                </TableCell>
                <TableCell>{row.forecast}</TableCell>
                <TableCell>
                  {row.confidence ? `${row.confidence}%` : "n/a"}
                </TableCell>
                <TableCell>
                  {row.reviewDate
                    ? new Date(row.reviewDate).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function buildSummaryMetrics(
  dataset: PerformanceDataset | null,
  radar: PerformanceRadarMetric[] | undefined,
  employeesCount: number,
): SummaryMetric[] {
  if (!dataset?.goalSummary) {
    return [];
  }
  const performanceMetric = radar?.find(
    (metric) => metric.metric === "Performance Score",
  );
  const reviewMetric = radar?.find(
    (metric) => metric.metric === "Review Health",
  );

  return [
    {
      id: "goal-progress",
      label: "Average Goal Progress",
      value: `${dataset.goalSummary.averageProgress ?? 0}%`,
      context: `${dataset.goalSummary.active ?? 0} active · ${dataset.goalSummary.completed ?? 0} completed`,
      tone: "purple",
    },
    {
      id: "performance-score",
      label: "Performance Score",
      value: `${performanceMetric?.actual ?? 0}%`,
      context: `Target ${performanceMetric?.target ?? 0}%`,
      tone: "blue",
    },
    {
      id: "review-health",
      label: "Review Health",
      value: `${reviewMetric?.actual ?? 0}%`,
      context: `${employeesCount} employees tracked`,
      tone: "green",
    },
  ];
}

function buildPredictionRows(
  goalReviews: PerformanceGoalReview[],
): PredictionRow[] {
  return goalReviews.slice(0, 5).map((review) => {
    const progress = review.goalProgress ?? 0;
    let forecast = "Stabilize trajectory over the next quarter";
    if (progress >= 90) {
      forecast = "On track to complete early";
    } else if (progress >= 70) {
      forecast = "Maintain focus to stay on target";
    } else if (progress >= 50) {
      forecast = "Add support to avoid delays";
    } else {
      forecast = "At risk — escalate coaching plan";
    }

    const confidence =
      typeof review.score === "number"
        ? Math.round((review.score / 5) * 100)
        : null;
    const trendClass =
      progress >= 80
        ? "text-emerald-600"
        : progress >= 60
          ? "text-blue-600"
          : progress >= 40
            ? "text-amber-600"
            : "text-red-500";

    return {
      id: review.reviewId ?? `${review.goalId}-${review.reviewDate}`,
      metric: review.goalTitle ?? "Goal",
      status: review.goalStatus ?? "active",
      progress,
      forecast,
      confidence,
      trendClass,
      reviewDate: review.reviewDate ?? null,
    };
  });
}

function buildRecommendations(
  goalReviews: PerformanceGoalReview[],
): Recommendation[] {
  if (goalReviews.length === 0) {
    return [
      {
        id: "placeholder",
        name: "Connect your goals workspace",
        badgeLabel: "AI Suggestion",
        message: "Sync active goals to unlock XP-based recommendations.",
        xpSnapshot: 120,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return goalReviews.slice(0, 4).map((review, index) => {
    const progress = review.goalProgress ?? 0;
    let badgeLabel = "Focus Goal";
    let badgeClassName = "bg-slate-100 text-slate-700";
    let message = "Align next steps with managers to maintain trajectory.";

    if (progress >= 80) {
      badgeLabel = "Accelerate";
      badgeClassName = "bg-emerald-100 text-emerald-700";
      message = "Add a stretch target for additional XP bonus.";
    } else if (progress < 40) {
      badgeLabel = "Intervene";
      badgeClassName = "bg-amber-100 text-amber-700";
      message = "Assign support tasks to unblock this goal.";
    }

    const xpSnapshot = progress >= 70 ? 180 : progress >= 50 ? 140 : 90;

    return {
      id: review.reviewId ?? `rec-${index}`,
      name: review.goalTitle ?? "Strategic Goal",
      badgeLabel,
      badgeClassName,
      message,
      xpSnapshot,
      createdAt: review.reviewDate ?? new Date().toISOString(),
    };
  });
}

function buildXpTrajectory(
  goalSummary: PerformanceDataset["goalSummary"] | undefined,
): Trajectory {
  if (!goalSummary) {
    return {
      totalXp: 0,
      nextMilestone: {
        label: "First milestone",
        xpRequired: 1000,
        description: "Complete goals and reviews to earn XP.",
      },
    };
  }
  const completed = goalSummary.completed ?? 0;
  const active = goalSummary.active ?? 0;
  const totalXp = completed * 150 + active * 60;
  const nextMilestone = {
    label: "Momentum Boost",
    xpRequired: Math.max(totalXp + 500, 1000),
    description: "Projected XP if recommendations are delivered.",
  };
  const previousMilestone =
    totalXp > 300
      ? {
          label: "Current Baseline",
          xpRequired: Math.max(totalXp - 500, 0),
          description: "Recent XP captured from goals and reviews.",
        }
      : undefined;
  return { totalXp, nextMilestone, previousMilestone };
}

const lastReviewLabel = (
  goalReviews: PerformanceGoalReview[],
): string | null => {
  if (goalReviews.length === 0) return null;
  const sorted = [...goalReviews].sort((a, b) => {
    const aDate = new Date(a.reviewDate ?? 0).getTime();
    const bDate = new Date(b.reviewDate ?? 0).getTime();
    return bDate - aDate;
  });
  const recent = sorted[0];
  return recent?.reviewDate
    ? formatDistanceToNow(new Date(recent.reviewDate), { addSuffix: true })
    : null;
};

export function AIInsightsPage() {
  const {
    dataset,
    radar = [],
    goalReviews = [],
    loading,
    error,
  } = usePerformanceOverview();
  const employeesCount = dataset?.employees.length ?? 0;
  const summaryMetrics = buildSummaryMetrics(dataset, radar, employeesCount);
  const predictionRows = buildPredictionRows(goalReviews);
  const recommendations = buildRecommendations(goalReviews);
  const trajectory = buildXpTrajectory(dataset?.goalSummary);
  const lastUpdatedLabel = lastReviewLabel(goalReviews);

  return (
    <div className="space-y-6 p-6">
      <InsightsHeader
        loading={loading}
        employeesTracked={employeesCount}
        lastRefreshLabel={lastUpdatedLabel}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load performance data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <InsightSummaryCards metrics={summaryMetrics} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <PredictionTable rows={predictionRows} loading={loading} />
        <RecommendationsPanel
          recommendations={recommendations}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<PanelFallback />}>
          <AIInsightsPanel type="dashboard" className="h-full" />
        </Suspense>
        <XPBar
          currentXP={trajectory.totalXp}
          nextMilestone={trajectory.nextMilestone}
          previousMilestone={trajectory.previousMilestone}
          loading={loading}
          className="h-full"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<PanelFallback />}>
          <PerformanceRadarChart data={radar} title="Performance vs Target" />
        </Suspense>
        <Suspense fallback={<PanelFallback />}>
          <EngagementOverview />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<PanelFallback />}>
          <ScenarioSimulator />
        </Suspense>
        <Suspense fallback={<PanelFallback />}>
          <AIQuickActions />
        </Suspense>
      </div>

      <Suspense fallback={<PanelFallback />}>
        <AIChatAssistant className="w-full" />
      </Suspense>
    </div>
  );
}

export default AIInsightsPage;
