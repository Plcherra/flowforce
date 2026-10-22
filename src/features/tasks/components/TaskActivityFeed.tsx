import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Flag,
  Calendar,
  Plus,
  Edit,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActivityFeedSkeleton } from "@/components/loading/TaskSkeletons";
import { fetchTaskActivitiesForCompany } from "@/features/tasks/repositories/taskActivitiesRepository";
import { fetchCompanyIdForUser } from "@/repositories/companyRepository";
import { supabase } from "@/integrations/supabase/client";
import type { TaskActivityWithActor } from "@/features/tasks/repositories/taskActivitiesRepository";
import { logger } from "@/utils/logger";

export function TaskActivityFeed() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const cleanupSubscription = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  useEffect(
    () => () => {
      cleanupSubscription();
    },
    [],
  );

  const activitiesQuery = useQuery({
    queryKey: ["task-activities", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const companyId = await fetchCompanyIdForUser(user.id);
      if (!companyId) {
        throw new Error("No company context found for the current user.");
      }
      return fetchTaskActivitiesForCompany(companyId);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) {
      cleanupSubscription();
      return;
    }

    let active = true;
    let channel: RealtimeChannel | null = null;

    const subscribe = async () => {
      try {
        const companyId = await fetchCompanyIdForUser(user.id);
        if (!companyId || !active) return;

        channel = supabase
          .channel(`task-activities-${companyId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "task_activities",
              filter: `company_id=eq.${companyId}`,
            },
            () => {
              queryClient.invalidateQueries({
                queryKey: ["task-activities", user.id],
              });
            },
          )
          .subscribe();

        subscriptionRef.current = channel;
      } catch (error) {
        logger.error("Error subscribing to task activities:", {
          error,
          tags: ["error"],
        });
      }
    };

    subscribe();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, queryClient]);

  const activities = activitiesQuery.data ?? [];
  const loading = activitiesQuery.isLoading;
  const error = activitiesQuery.error
    ? (activitiesQuery.error as Error).message
    : null;

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "task_created":
        return <Plus className="h-4 w-4 text-primary" />;
      case "task_assigned":
        return <User className="h-4 w-4 text-success" />;
      case "task_status_changed":
        return <Flag className="h-4 w-4 text-secondary" />;
      case "task_completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "task_commented":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "task_updated":
        return <Edit className="h-4 w-4 text-warning" />;
      case "task_due_changed":
        return <Calendar className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case "task_created":
        return "bg-primary/10 border-l-primary";
      case "task_assigned":
        return "bg-success-muted border-l-success";
      case "task_status_changed":
        return "bg-secondary/10 border-l-secondary";
      case "task_completed":
        return "bg-success-muted border-l-success";
      case "task_commented":
        return "bg-primary/10 border-l-primary";
      case "task_updated":
        return "bg-warning-muted border-l-warning";
      case "task_due_changed":
        return "bg-destructive/10 border-l-destructive";
      default:
        return "bg-background border-l-foreground";
    }
  };

  const getActorMeta = (activity: TaskActivityWithActor) => {
    const first = activity.actor?.first_name ?? "";
    const last = activity.actor?.last_name ?? "";
    const name = `${first} ${last}`.trim() || "Task activity";
    const initialsCandidate = `${first.charAt(0)}${last.charAt(0)}`
      .trim()
      .toUpperCase();
    const initials = initialsCandidate || name.charAt(0).toUpperCase() || "T";

    return { name, initials };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {t("tasks.recentActivity")}
          </CardTitle>
          <CardDescription>
            {t("tasks.latestUpdatesAndChangesAcrossAllTasks")}
          </CardDescription>
        </CardHeader>
        <ActivityFeedSkeleton />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          {t("tasks.recentActivity")}
        </CardTitle>
        <CardDescription>
          {t("tasks.latestUpdatesAndChangesAcrossAllTasks")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>{t("tasks.activityFeedUnavailable")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <ScrollArea className="h-96">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("tasks.weReTryingToReconnectToYourActivity")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("tasks.updatesWillResumeAutomatically")}
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("tasks.noRecentActivity")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("tasks.activityWillAppearHereAsYouWorkOn")}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {activities.map((activity, index) => {
                const { name: actorName, initials } = getActorMeta(activity);
                return (
                  <div
                    key={activity.id}
                    className={`p-4 border-l-2 ${getActivityColor(activity.action_type)} ${
                      index !== activities.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.action_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {actorName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(activity.created_at),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>

                        <p className="text-sm text-foreground mb-2">
                          {activity.description}
                        </p>

                        {activity.metadata &&
                          typeof activity.metadata === "object" &&
                          activity.metadata !== null && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {(activity.metadata as any).old_value &&
                                (activity.metadata as any).new_value && (
                                  <span>
                                    Changed from &quot;
                                    {(activity.metadata as any).old_value}&quot; to &quot;
                                    {(activity.metadata as any).new_value}&quot;
                                  </span>
                                )}
                              {(activity.metadata as any).task_title && (
                                <Badge
                                  variant="outline"
                                  className="text-xs ml-2"
                                >
                                  {(activity.metadata as any).task_title}
                                </Badge>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
