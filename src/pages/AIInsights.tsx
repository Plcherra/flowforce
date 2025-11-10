import { lazy, Suspense, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/resources/LoadingSpinner';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { Brain, Users } from 'lucide-react';

const AIInsightsPanel = lazy(() => import('@/components/ai/AIInsightsPanel'));
const AIChatAssistant = lazy(() => import('@/components/ai/AIChatAssistant'));
const PerformanceRadarChart = lazy(() => import('@/components/ai/PerformanceRadarChart'));
const ScenarioSimulator = lazy(() => import('@/components/ai/ScenarioSimulator'));
const AIQuickActions = lazy(() => import('@/components/ai/AIQuickActions'));
const EngagementOverview = lazy(() => import('@/components/company-updates/EngagementOverview'));

const PanelFallback = () => (
  <Card className="h-full">
    <CardContent className="flex h-48 items-center justify-center">
      <LoadingSpinner />
    </CardContent>
  </Card>
);

export default function AIInsights() {
  const { radar, loading, error: performanceError, dataset } = usePerformanceOverview();

  const goalSummary = dataset?.goalSummary;
  const goalReviews = dataset?.goalReviews ?? [];
  const summaryLoading = loading && !dataset;
  const predictionsLoading = loading && !dataset;
  const employeesCount = dataset?.employees.length ?? 0;

  const summaryMetricToneClasses: Record<'purple' | 'green' | 'blue', string> = {
    purple: 'border border-primary/20 bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary-foreground',
    green:
      'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-500/20 dark:text-emerald-200',
    blue:
      'border border-sky-400/30 bg-sky-500/10 text-sky-700 dark:border-sky-300/40 dark:bg-sky-500/20 dark:text-sky-200',
  };

  const summaryMetrics = useMemo(() => {
    if (!goalSummary) return [];

    const performanceMetric = radar.find((metric) => metric.metric === 'Performance Score');
    const reviewMetric = radar.find((metric) => metric.metric === 'Review Health');

    return [
      {
        id: 'goal-progress',
        label: 'Average Goal Progress',
        value: `${goalSummary.averageProgress ?? 0}%`,
        context: `${goalSummary.active ?? 0} active · ${goalSummary.completed ?? 0} completed`,
        tone: 'purple' as const,
      },
      {
        id: 'performance-score',
        label: 'Performance Score',
        value: `${performanceMetric?.actual ?? 0}%`,
        context: `Target ${performanceMetric?.target ?? 0}%`,
        tone: 'blue' as const,
      },
      {
        id: 'review-health',
        label: 'Review Health',
        value: `${reviewMetric?.actual ?? 0}%`,
        context: `${employeesCount} employees tracked`,
        tone: 'green' as const,
      },
    ];
  }, [goalSummary, radar, employeesCount]);

  const predictionRows = useMemo(() => {
    return goalReviews.slice(0, 4).map((review) => {
      const progress = review.goalProgress ?? 0;
    const status = (review.goalStatus ?? 'active').toString();
    const confidence = review.score != null ? Math.round((review.score / 5) * 100) : null;
    let forecast = 'Stabilise trajectory over the next quarter';
    if (progress >= 90) {
      forecast = 'On track to complete early';
    } else if (progress >= 70) {
      forecast = 'Maintain focus to stay on target';
    } else if (progress >= 50) {
      forecast = 'Add support to avoid delays';
    } else {
      forecast = 'At risk — escalate coaching plan';
    }

    const trendClass =
      progress >= 80
        ? 'text-emerald-600'
        : progress >= 60
          ? 'text-blue-600'
          : progress >= 40
            ? 'text-amber-600'
            : 'text-red-500';

      return {
        id: review.reviewId,
        metric: review.goalTitle ?? 'Goal',
        status,
        progress,
        forecast,
        confidence,
        trendClass,
        reviewDate: review.reviewDate,
      };
    });
  }, [goalReviews]);

  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
            <p className="text-gray-600 mt-1">
              Advanced analytics, predictions, and AI-powered recommendations
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="simulator">What-If</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Suspense fallback={<PanelFallback />}>
                <AIInsightsPanel type="dashboard" className="xl:col-span-1" />
              </Suspense>

              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-2 xl:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2" />
                      AI Analytics Summary
                    </CardTitle>
                    <CardDescription>
                      Key signals from performance, goals, and review health
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={`summary-skeleton-${index}`} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : performanceError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Unable to load performance summary</AlertTitle>
                        <AlertDescription>{performanceError}</AlertDescription>
                      </Alert>
                    ) : summaryMetrics.length ? (
                      <div className="space-y-4">
                        {summaryMetrics.map((metric) => {
                          const toneClass = summaryMetricToneClasses[metric.tone];
                          return (
                            <div
                              key={metric.id}
                              className={`flex items-center justify-between rounded-lg p-3 ${toneClass}`}
                            >
                              <div>
                                <p className="text-sm font-medium">{metric.label}</p>
                                <p className="text-xs opacity-75">{metric.context}</p>
                              </div>
                              <span className="text-lg font-semibold">{metric.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Connect your performance workspace to unlock live AI analytics.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Suspense fallback={<PanelFallback />}>
                  <AIQuickActions />
                </Suspense>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Engagement Intelligence
                    </CardTitle>
                    <CardDescription>
                      AI-driven summaries of company update engagement for admins and managers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>}>
                      <EngagementOverview />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Suspense fallback={<PanelFallback />}>
                <AIInsightsPanel type="scheduler" className="xl:col-span-1" />
              </Suspense>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>
                    Detailed performance metrics and team analysis
                  </CardDescription>
                </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-10">
                        <LoadingSpinner />
                      </div>
                    ) : performanceError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Unable to load performance analytics</AlertTitle>
                        <AlertDescription>{performanceError}</AlertDescription>
                      </Alert>
                    ) : radar.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Connect your performance data to visualize radar trends.
                      </div>
                    ) : (
                      <Suspense fallback={<div className="flex items-center justify-center py-10"><LoadingSpinner /></div>}>
                        <PerformanceRadarChart data={radar} />
                      </Suspense>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Suspense fallback={<PanelFallback />}>
                <AIInsightsPanel type="expenses" className="xl:col-span-1" />
              </Suspense>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>AI Predictions</CardTitle>
                  <CardDescription>
                    Forecasts and trend analysis based on your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    Forecasts generated from the latest goal reviews and AI scoring data.
                  </div>
                  {predictionsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={`prediction-skeleton-${index}`} className="rounded-md border p-3">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="mt-2 h-3 w-64" />
                        </div>
                      ))}
                    </div>
                  ) : performanceError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Unable to build predictions</AlertTitle>
                      <AlertDescription>{performanceError}</AlertDescription>
                    </Alert>
                  ) : predictionRows.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-4 font-medium">Metric</th>
                            <th className="py-2 pr-4 font-medium">Current Trend</th>
                            <th className="py-2 pr-4 font-medium">90-Day Forecast</th>
                            <th className="py-2 font-medium">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {predictionRows.map((row) => (
                            <tr key={row.id} className="border-t">
                              <td className="py-3 pr-4">
                                <div className="font-medium text-foreground">{row.metric}</div>
                                <div className="text-xs text-muted-foreground">
                                  Reviewed {row.reviewDate ? new Date(row.reviewDate).toLocaleDateString() : 'Recently'}
                                </div>
                              </td>
                              <td className={`py-3 pr-4 font-semibold ${row.trendClass}`}>
                                {row.progress}% · {row.status}
                              </td>
                              <td className="py-3 pr-4 text-foreground">{row.forecast}</td>
                              <td className="py-3 text-muted-foreground">
                                {row.confidence != null ? `${row.confidence}%` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Publish goal reviews to unlock AI forecasts.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Suspense fallback={<PanelFallback />}>
                <AIInsightsPanel type="reports" className="xl:col-span-1" />
              </Suspense>
              <Suspense fallback={<PanelFallback />}>
                <ScenarioSimulator className="xl:col-span-2" />
              </Suspense>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* AI Chat Assistant */}
      <Suspense fallback={null}>
        <AIChatAssistant context="insights" />
      </Suspense>
    </div>
  );
}
