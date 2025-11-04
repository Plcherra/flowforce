import { useMemo } from 'react';
import { Activity, BarChart2, Clock, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LearningCatalogRecord, LearningCourseMetrics, LearningEnrollment } from '@/types/learning';

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

export function AnalyticsOverview({ metrics, totals, adminEnrollments, courseById, trainingInsights }: AnalyticsOverviewProps) {
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
    return Array.from(map.entries()).map(([category, value]) => ({ category, ...value }));
  }, [metrics]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Active courses</CardTitle>
            <CardDescription>Programs available to the team</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totals.totalCourses}</div>
              <p className="text-xs text-muted-foreground">{metrics.length} tracked in Supabase</p>
            </div>
            <BarChart2 className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Active learners</CardTitle>
            <CardDescription>In-progress enrollments</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totals.totalActiveLearners}</div>
              <p className="text-xs text-muted-foreground">{adminEnrollments.length} total enrollments</p>
            </div>
            <Users className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Hours logged</CardTitle>
            <CardDescription>Tracked through Supabase events</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totals.totalHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Avg progress {totals.averageProgress.toFixed(0)}%</p>
            </div>
            <Clock className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">XP awarded</CardTitle>
            <CardDescription>Credits applied to skill matrix</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totals.totalXp}</div>
              <p className="text-xs text-muted-foreground">{totals.totalCompletions} completions</p>
            </div>
            <Activity className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
      </div>

      {trainingInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Copilot insights</CardTitle>
            <CardDescription>AI summary of recent completions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Total completions</span>
              <span className="font-semibold">{trainingInsights.totalCompletions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average XP per course</span>
              <span className="font-semibold">{trainingInsights.avgXP.toFixed(0)} XP</span>
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
            <CardTitle className="text-sm font-semibold">Top courses</CardTitle>
            <CardDescription>Completion and participation over the last quarter</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCourses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-10} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completions" name="Completions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active" name="Active" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {categorySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Category performance</CardTitle>
            <CardDescription>Where teams are spending their learning hours.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {categorySummary.map((entry) => (
              <div key={entry.category} className="rounded-md border p-4">
                <p className="text-sm font-semibold">{entry.category}</p>
                <p className="mt-2 text-xs text-muted-foreground">{entry.completions} completions</p>
                <p className="text-xs text-muted-foreground">{entry.active} active learners</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
