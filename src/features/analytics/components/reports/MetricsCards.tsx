/**
 * Metrics cards component for ReportsAnalyzer
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldCheck, TrendingUp, Workflow } from "lucide-react";

interface MetricsCardsProps {
  completionRate: number;
  reportsEngagementScore: number;
  accuracyScore: number;
  followUpActions: number;
}

export function MetricsCards({
  completionRate,
  reportsEngagementScore,
  accuracyScore,
  followUpActions,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Completion rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{completionRate}%</div>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Combined forms and reports completed this window.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">
              {reportsEngagementScore}%
            </div>
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Reports analyzed vs intake, factoring follow-up actions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{accuracyScore}%</div>
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Percent of reports that finished processing successfully.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Follow-up actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{followUpActions}</div>
            <Workflow className="h-5 w-5 text-purple-500" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tasks spawned from AI insights and report reviews.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
