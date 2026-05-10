import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InsightData {
  overworkedStaff: Array<{
    name: string;
    hours: number;
    recommendation: string;
  }>;
  underutilizedStaff: Array<{
    name: string;
    hours: number;
    recommendation: string;
  }>;
  attendanceIssues: Array<{
    name: string;
    issueType: string;
    frequency: number;
  }>;
  roleGaps: Array<{
    role: string;
    gapHours: number;
    impact: string;
  }>;
  recommendations: string[];
}

interface CoverageStats {
  totalShifts: number;
  assignedShifts: number;
  coveragePercentage: number;
  totalHours: number;
  estimatedCost: number;
  efficiency: number;
}

export function AIInsightsDashboard() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [coverage, setCoverage] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInsights = async () => {
    try {
      setRefreshing(true);

      // Get AI insights
      const { data: insightsData, error: insightsError } =
        await supabase.functions.invoke("ai-scheduling-assistant", {
          body: {
            action: "generate_insights",
            data: { companyId: "current" },
          },
        });

      if (insightsError) throw insightsError;
      setInsights(insightsData.insights);

      // Get coverage analysis
      const { data: coverageData, error: coverageError } =
        await supabase.functions.invoke("ai-scheduling-assistant", {
          body: {
            action: "analyze_coverage",
            data: {
              companyId: "current",
              weekStart: new Date().toISOString(),
            },
          },
        });

      if (coverageError) throw coverageError;

      setCoverage({
        totalShifts: coverageData.coverage?.totalShifts || 0,
        assignedShifts: coverageData.coverage?.assignedShifts || 0,
        coveragePercentage: coverageData.coveragePercentage || 0,
        totalHours: coverageData.coverage?.totalHours || 0,
        estimatedCost: coverageData.coverage?.estimatedCost || 0,
        efficiency: coverageData.coverage?.efficiency || 0,
      });
    } catch (error) {
      toast({
        title: "Failed to load insights",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            AI Insights Dashboard
          </h2>
          <p className="text-muted-foreground">
            Smart analytics and recommendations for optimal scheduling
          </p>
        </div>
        <Button
          onClick={loadInsights}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Coverage Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {coverage?.coveragePercentage || 0}%
            </div>
            <Progress
              value={coverage?.coveragePercentage || 0}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {coverage?.assignedShifts}/{coverage?.totalShifts} shifts assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Hours</span>
            </div>
            <div className="text-2xl font-bold">
              {coverage?.totalHours || 0}h
            </div>
            <p className="text-xs text-green-600 mt-1">+5% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Labor Cost</span>
            </div>
            <div className="text-2xl font-bold">
              ${coverage?.estimatedCost || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Est. weekly cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Efficiency</span>
            </div>
            <div className="text-2xl font-bold">
              {coverage?.efficiency || 0}%
            </div>
            <p className="text-xs text-blue-600 mt-1">AI optimized</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Workload Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Staff Workload Analysis
            </CardTitle>
            <CardDescription>
              Identify overworked and underutilized team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights?.overworkedStaff?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-red-600">
                  Overworked Staff
                </h4>
                <div className="space-y-2">
                  {insights.overworkedStaff.slice(0, 3).map((staff, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {staff.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {staff.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {staff.hours}h
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {staff.recommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights?.underutilizedStaff?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-blue-600">
                  Underutilized Staff
                </h4>
                <div className="space-y-2">
                  {insights.underutilizedStaff
                    .slice(0, 3)
                    .map((staff, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {staff.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {staff.hours}h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {staff.recommendation}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Smart suggestions to optimize your scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights?.recommendations?.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="p-1 bg-primary/10 rounded">
                    <TrendingUp className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{recommendation}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">
                    Apply
                  </Button>
                </div>
              ))}

              {(!insights?.recommendations ||
                insights.recommendations.length === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recommendations available</p>
                  <p className="text-xs">
                    AI is analyzing your scheduling patterns
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Coverage Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Role Coverage Analysis
          </CardTitle>
          <CardDescription>
            Track coverage levels across different roles and time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* No demo role rows — awaiting backend-provided breakdown */}
            <div className="col-span-2 md:col-span-4 text-center text-sm text-muted-foreground py-4">
              No role coverage data available.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
