import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import AIChatAssistant from '@/components/ai/AIChatAssistant';
import PerformanceRadarChart from '@/components/ai/PerformanceRadarChart';
import ScenarioSimulator from '@/components/ai/ScenarioSimulator';
import LoadingSpinner from '@/components/resources/LoadingSpinner';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { Brain, Users } from 'lucide-react';
import AIQuickActions from '@/components/ai/AIQuickActions';
import EngagementOverview from '@/components/company-updates/EngagementOverview';

export default function AIInsights() {
  const { radar, loading, error: performanceError, dataset } = usePerformanceOverview();

  const goalSummary = dataset?.goalSummary;
  const goalReviews = dataset?.goalReviews ?? [];
  const summaryLoading = loading && !dataset;
  const predictionsLoading = loading && !dataset;

  const getRadarMetric = (label: string) => radar.find((metric) => metric.metric === label);

  const summaryMetrics = goalSummary
    ? [
        {
          id: 'goal-progress',
          label: 'Average Goal Progress',
          value: `${goalSummary.averageProgress ?? 0}%`,
          context: `${goalSummary.active ?? 0} active · ${goalSummary.completed ?? 0} completed`,
          tone: 'purple',
        },
        {
          id: 'performance-score',
          label: 'Performance Score',
          value: `${getRadarMetric('Performance Score')?.actual ?? 0}%`,
          context: `Target ${getRadarMetric('Performance Score')?.target ?? 0}%`,
          tone: 'blue',
        },
        {
          id: 'review-health',
          label: 'Review Health',
          value: `${getRadarMetric('Review Health')?.actual ?? 0}%`,
          context: `${dataset?.employees.length ?? 0} employees tracked`,
          tone: 'green',
        },
      ]
    : [];

  const predictionRows = goalReviews.slice(0, 4).map((review) => {
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <AIInsightsPanel type="dashboard" className="xl:col-span-1" />

              <div className="grid grid-cols-1 gap-6 xl:col-span-2">
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
                          const toneClass =
                            metric.tone === 'purple'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : metric.tone === 'green'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-blue-50 border-blue-200 text-blue-700';

                          return (
                            <div
                              key={metric.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${toneClass}`}
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

                <AIQuickActions />

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
                    <EngagementOverview />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <AIInsightsPanel type="scheduler" className="xl:col-span-1" />

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
                      <PerformanceRadarChart data={radar} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <AIInsightsPanel type="expenses" className="xl:col-span-1" />

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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <AIInsightsPanel type="reports" className="xl:col-span-1" />
              <ScenarioSimulator className="xl:col-span-2" />
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant context="insights" />
    </div>
  );
}
