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
  }, [user?.id, queryClient]);

  const activities = activitiesQuery.data ?? [];
  const loading = activitiesQuery.isLoading;
  const error = activitiesQuery.error
    ? (activitiesQuery.error as Error).message
    : null;

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "task_created":
        return <Plus className="h-4 w-4 text-blue-500" />;
      case "task_assigned":
        return <User className="h-4 w-4 text-green-500" />;
      case "task_status_changed":
        return <Flag className="h-4 w-4 text-purple-500" />;
      case "task_completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "task_commented":
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case "task_updated":
        return <Edit className="h-4 w-4 text-orange-500" />;
      case "task_due_changed":
        return <Calendar className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case "task_created":
        return "bg-blue-50 border-l-blue-500 dark:bg-blue-500/10";
      case "task_assigned":
        return "bg-green-50 border-l-green-500 dark:bg-green-500/10";
      case "task_status_changed":
        return "bg-purple-50 border-l-purple-500 dark:bg-purple-500/10";
      case "task_completed":
        return "bg-green-50 border-l-green-600 dark:bg-green-500/10";
      case "task_commented":
        return "bg-indigo-50 border-l-indigo-500 dark:bg-indigo-500/10";
      case "task_updated":
        return "bg-orange-50 border-l-orange-500 dark:bg-orange-500/10";
      case "task_due_changed":
        return "bg-red-50 border-l-red-500 dark:bg-red-500/10";
      default:
        return "bg-gray-50 border-l-gray-500 dark:bg-slate-800/40";
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
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest updates and changes across all tasks
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
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest updates and changes across all tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Activity feed unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <ScrollArea className="h-96">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                We’re trying to reconnect to your activity feed.
              </p>
              <p className="text-xs text-muted-foreground">
                Updates will resume automatically.
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
              <p className="text-xs text-muted-foreground">
                Activity will appear here as you work on tasks
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
                        ? "border-b border-gray-100 dark:border-slate-800"
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

                        <p className="text-sm text-gray-900 mb-2">
                          {activity.description}
                        </p>

                        {activity.metadata &&
                          typeof activity.metadata === "object" &&
                          activity.metadata !== null && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {(activity.metadata as any).old_value &&
                                (activity.metadata as any).new_value && (
                                  <span>
                                    Changed from "
                                    {(activity.metadata as any).old_value}" to "
                                    {(activity.metadata as any).new_value}"
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
