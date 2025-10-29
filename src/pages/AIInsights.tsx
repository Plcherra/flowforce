import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import AIChatAssistant from '@/components/ai/AIChatAssistant';
import PerformanceRadarChart from '@/components/ai/PerformanceRadarChart';
import ScenarioSimulator from '@/components/ai/ScenarioSimulator';
import LoadingSpinner from '@/components/resources/LoadingSpinner';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { Brain, TrendingUp, Users, Target } from 'lucide-react';
import AIQuickActions from '@/components/ai/AIQuickActions';

export default function AIInsights() {
  const { radar, loading } = usePerformanceOverview();

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
                      Key insights and recommendations from your data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium">Productivity Trend</span>
                        </div>
                        <span className="text-sm text-blue-600 font-semibold">+12% this week</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium">Team Efficiency</span>
                        </div>
                        <span className="text-sm text-green-600 font-semibold">Above average</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center">
                          <Target className="h-4 w-4 text-purple-600 mr-2" />
                          <span className="text-sm font-medium">Goal Achievement</span>
                        </div>
                        <span className="text-sm text-purple-600 font-semibold">85% complete</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <AIQuickActions />
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
                  ) : (
                    <PerformanceRadarChart data={radar.length ? radar : undefined} />
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
                    Use the forecast table below to understand how workforce efficiency, cost, and goal
                    attainment are projected to change over the next quarter.
                  </div>
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
                        <tr className="border-t">
                          <td className="py-3 pr-4">Labor Spend</td>
                          <td className="py-3 pr-4 text-red-500">+3.5%</td>
                          <td className="py-3 pr-4">Normalize by week 8</td>
                          <td className="py-3 text-muted-foreground">82%</td>
                        </tr>
                        <tr className="border-t">
                          <td className="py-3 pr-4">Schedule Efficiency</td>
                          <td className="py-3 pr-4 text-emerald-600">+5.2%</td>
                          <td className="py-3 pr-4">Sustain growth with minor adjustments</td>
                          <td className="py-3 text-muted-foreground">88%</td>
                        </tr>
                        <tr className="border-t">
                          <td className="py-3 pr-4">Goal Achievement</td>
                          <td className="py-3 pr-4 text-blue-600">85% complete</td>
                          <td className="py-3 pr-4">On track for 94% completion</td>
                          <td className="py-3 text-muted-foreground">90%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
