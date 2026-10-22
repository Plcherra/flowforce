/**
 * Copilot insights panel component
 */

import {
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CopilotInsight } from "../types/userManagement";

interface CopilotInsightsPanelProps {
  insights: CopilotInsight[];
  isLoading: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  onReactivate?: (employeeId: string) => void;
}

export function CopilotInsightsPanel({
  insights,
  isLoading,
  isFetching = false,
  onRefresh,
  onReactivate,
}: CopilotInsightsPanelProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            AI Co-Pilot insights
          </CardTitle>
          <CardDescription>
            Loading insights from your team data…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Analyzing team patterns…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            AI Co-Pilot insights
          </CardTitle>
          <CardDescription>
            Surface gaps, opportunities, and at-risk teammates automatically.
          </CardDescription>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No alerts from Copilot. Coverage and engagement look healthy!
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              let icon = <Sparkles className="h-4 w-4 text-secondary" />;
              let badgeClass = "bg-secondary/10 text-secondary border-secondary/40";
              let badgeLabel = "Insight";
              let action: React.ReactNode | null = null;

              switch (insight.type) {
                case "promotion":
                  icon = <TrendingUp className="h-4 w-4 text-success" />;
                  badgeClass =
                    "bg-success-muted text-success border-success/40";
                  badgeLabel = "Promotion";
                  if (insight.employeeId) {
                    action = (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/performance?focus=${insight.employeeId}`)
                        }
                      >
                        Review
                      </Button>
                    );
                  }
                  break;
                case "coaching":
                  icon = <MessageCircle className="h-4 w-4 text-warning" />;
                  badgeClass = "bg-warning-muted text-warning border-warning/40";
                  badgeLabel = "Coaching";
                  if (insight.employeeId) {
                    action = (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/performance?focus=${insight.employeeId}`)
                        }
                      >
                        View notes
                      </Button>
                    );
                  }
                  break;
                case "roleGap":
                  icon = <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
                  badgeClass = "bg-accent/60 text-accent-foreground border-accent/40";
                  badgeLabel = "Coverage gap";
                  action = (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/position-management")}
                    >
                      Assign
                    </Button>
                  );
                  break;
                case "inactive":
                  icon = <UserX className="h-4 w-4 text-primary" />;
                  badgeClass = "bg-primary/10 text-primary border-primary/40";
                  badgeLabel = "Inactive";
                  action = insight.employeeId ? (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/employees?focus=${insight.employeeId}`)
                        }
                      >
                        Review
                      </Button>
                      {onReactivate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReactivate(insight.employeeId!)}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  ) : null;
                  break;
              }

              return (
                <div
                  key={insight.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      <div className="rounded-full bg-muted p-2">{icon}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {insight.title}
                          </span>
                          <Badge className={cn("border", badgeClass)}>
                            {badgeLabel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    {action}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
