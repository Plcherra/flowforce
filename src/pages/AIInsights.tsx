import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import AIChatAssistant from '@/components/ai/AIChatAssistant';
import PerformanceRadarChart from '@/components/ai/PerformanceRadarChart';

import { Brain, TrendingUp, Users, Target, Zap } from 'lucide-react';

export default function AIInsights() {
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

        {/* Quick Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AIInsightsPanel type="dashboard" />
          <AIInsightsPanel type="scheduler" />
          <AIInsightsPanel type="expenses" />
          <AIInsightsPanel type="reports" />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="simulator">What-If</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    AI-recommended actions for your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="font-medium text-sm">Optimize schedule coverage</div>
                      <div className="text-xs text-gray-500 mt-1">
                        AI detected potential gaps in next week's schedule
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="font-medium text-sm">Review task assignments</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Some team members may be overloaded
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="font-medium text-sm">Plan team training</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Skills gap analysis suggests focused training areas
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed performance metrics and team analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceRadarChart />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Predictions</CardTitle>
                <CardDescription>
                  Forecasts and trend analysis based on your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Predictive Analytics</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Advanced prediction models will be available here, including workload forecasting, 
                    resource optimization, and performance predictions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant context="insights" />
    </div>
  );
}
