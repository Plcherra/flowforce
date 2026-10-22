import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Activity, BarChart2, Clock, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  LearningCatalogRecord,
  LearningCourseMetrics,
  LearningEnrollment,
} from "@/types/learning";
import {
  CATEGORY_LABEL_KEYS,
  learningLabel,
} from "@/features/learning/learningLabels";

interface TrainingInsightSummary {
  totalCompletions: number;
  avgXP: number;
  suggestions: string;
}

interface AnalyticsOverviewProps {
  metrics: LearningCourseMetrics[];
  totals: {
    totalCourses: number;
    totalCompletions: number;
    totalActiveLearners: number;
    totalHours: number;
    totalXp: number;
    averageProgress: number;
  };
  adminEnrollments: LearningEnrollment[];
  courseById: Map<string, LearningCatalogRecord>;
  trainingInsights?: TrainingInsightSummary | null;
}

export function AnalyticsOverview({
  metrics,
  totals,
  adminEnrollments,
  courseById,
  trainingInsights,
}: AnalyticsOverviewProps) {
  const { t } = useTranslation();
  const topCourses = useMemo(() => {
    return [...metrics]
      .sort((a, b) => (b.completions ?? 0) - (a.completions ?? 0))
      .slice(0, 5)
      .map((metric) => ({
        name: courseById.get(metric.courseId)?.title ?? metric.title,
        completions: metric.completions,
        active: metric.activeLearners,
      }));
  }, [metrics, courseById]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, { completions: number; active: number }>();
    metrics.forEach((metric) => {
      const entry = map.get(metric.category) ?? { completions: 0, active: 0 };
      entry.completions += metric.completions ?? 0;
      entry.active += metric.activeLearners ?? 0;
      map.set(metric.category, entry);
    });
    return Array.from(map.entries()).map(([category, value]) => ({
      category,
      ...value,
    }));
  }, [metrics]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("learning.activeCourses")}
            </CardTitle>
            <CardDescription>{t("learning.programsAvailableToTheTeam")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totals.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                {t("learning.trackedInSupabase", { count: metrics.length })}
              </p>
            </div>
            <BarChart2 className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("learning.activeLearners")}
            </CardTitle>
            <CardDescription>{t("learning.inProgressEnrollments")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {totals.totalActiveLearners}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("learning.totalEnrollments", {
                  count: adminEnrollments.length,
                })}
              </p>
            </div>
            <Users className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("learning.hoursLogged")}
            </CardTitle>
            <CardDescription>{t("learning.trackedThroughSupabaseEvents")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {totals.totalHours.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("learning.avgProgress", {
                  percent: totals.averageProgress.toFixed(0),
                })}
              </p>
            </div>
            <Clock className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("learning.xpAwarded")}</CardTitle>
            <CardDescription>{t("learning.creditsAppliedToSkillMatrix")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totals.totalXp}</div>
              <p className="text-xs text-muted-foreground">
                {t("learning.completionCount", {
                  count: totals.totalCompletions,
                })}
              </p>
            </div>
            <Activity className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
      </div>

      {trainingInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("learning.copilotInsights")}
            </CardTitle>
            <CardDescription>{t("learning.aiSummaryOfRecentCompletions")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>{t("learning.totalCompletions")}</span>
              <span className="font-semibold">
                {trainingInsights.totalCompletions}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t("learning.averageXpPerCourse")}</span>
              <span className="font-semibold">
                {trainingInsights.avgXP.toFixed(0)} XP
              </span>
            </div>
            <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              {trainingInsights.suggestions}
            </p>
          </CardContent>
        </Card>
      )}

      {topCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("learning.topCourses")}</CardTitle>
            <CardDescription>
              {t("learning.completionAndParticipationOverTheLastQuarter")}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCourses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="completions"
                  name={t("learning.chartCompletions")}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="active"
                  name={t("learning.chartActive")}
                  fill="hsl(var(--secondary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {categorySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("learning.categoryPerformance")}
            </CardTitle>
            <CardDescription>
              {t("learning.whereTeamsAreSpendingTheirLearningHours")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {categorySummary.map((entry) => (
              <div key={entry.category} className="rounded-md border p-4">
                <p className="text-sm font-semibold">
                  {learningLabel(t, CATEGORY_LABEL_KEYS, entry.category)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("learning.completionCount", { count: entry.completions })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("learning.activeLearnersCount", { count: entry.active })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
