import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { subscribeTaskNotificationsRealtime } from "@/features/tasks/hooks/taskNotificationsRealtime";
import {
  createTaskNotification,
  deleteNotification as deleteNotificationRecord,
  fetchNotificationsForUser,
  fetchOverdueTasks,
  fetchTasksDueSoon,
  findRecentNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NewNotificationInput,
  type TaskNotification,
} from "@/features/tasks/repositories/taskNotificationsRepository";
import { translatedStatusLabel } from "@/features/tasks/utils/taskCopy";

const NOTIFICATION_QUERY_KEY = "task-notifications";

export function useTaskNotifications() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [serviceError, setServiceError] = useState<string | null>(null);

  const notificationsQuery = useQuery({
    queryKey: [NOTIFICATION_QUERY_KEY, user?.id],
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return [];
      return fetchNotificationsForUser(user.id);
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );
  const loading = notificationsQuery.isLoading && Boolean(user);
  const queryError = notificationsQuery.error
    ? (notificationsQuery.error as Error).message
    : null;
  const error = serviceError ?? queryError;

  const invalidateNotifications = () => {
    if (!user?.id) return Promise.resolve();
    return queryClient.invalidateQueries({
      queryKey: [NOTIFICATION_QUERY_KEY, user.id],
    });
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    return subscribeTaskNotificationsRealtime(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        const notification = payload.new as TaskNotification;
        toast({
          title: notification.title,
          description: notification.message,
          duration: 5000,
        });
      }
      void invalidateNotifications();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [user?.id, toast]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const runChecks = async () => {
      try {
        await checkDueTasks(user.id);
        if (isMounted) {
          setServiceError(null);
        }
      } catch (error) {
        // Handle various error types and extract meaningful messages
        let errorMessage = t("tasks.unableCheckDue");

        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (error && typeof error === "object") {
          if ("message" in error && typeof error.message === "string") {
            errorMessage = error.message;
          } else if ("error" in error && typeof error.error === "string") {
            errorMessage = error.error;
          } else if ("code" in error) {
            errorMessage = t("tasks.errorCode", { code: String(error.code) });
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        logger.error("Error checking due tasks:", {
          error,
          context: { errorMessage },
          tags: ["error"],
        });

        if (isMounted) {
          setServiceError(errorMessage);
        }
      }
    };

    runChecks();
    const interval = setInterval(runChecks, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [user?.id]);

  const checkDueTasks = async (userId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const lastDayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const dueSoon = await fetchTasksDueSoon(userId, tomorrow.toISOString());
    for (const task of dueSoon) {
      if (!task.due_date) continue;
      const existing = await findRecentNotification(
        userId,
        task.id,
        "task_due_soon",
        lastDayIso,
      );
      if (!existing) {
        await createTaskNotification({
          user_id: userId,
          task_id: task.id,
          type: "task_due_soon",
          title: t("tasks.notifyDueSoon"),
          message: t("tasks.notifyDueSoonMessage", { title: task.title }),
          metadata: {
            task_title: task.title,
            priority: task.priority,
            due_date: task.due_date,
          },
        });
      }
    }

    const overdue = await fetchOverdueTasks(userId);
    for (const task of overdue) {
      if (!task.due_date) continue;
      const existing = await findRecentNotification(
        userId,
        task.id,
        "task_overdue",
        lastDayIso,
      );
      if (!existing) {
        await createTaskNotification({
          user_id: userId,
          task_id: task.id,
          type: "task_overdue",
          title: t("tasks.notifyOverdue"),
          message: t("tasks.notifyOverdueMessage", { title: task.title }),
          metadata: {
            task_title: task.title,
            priority: task.priority,
            due_date: task.due_date,
          },
        });
      }
    }

    await invalidateNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await invalidateNotifications();
    } catch (error) {
      logger.error("Error marking notification as read:", {
        error,
        tags: ["error"],
      });
      setServiceError(
        (error as Error)?.message ?? t("tasks.unableUpdateNotification"),
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.id);
      await invalidateNotifications();
    } catch (error) {
      logger.error("Error marking notifications as read:", {
        error,
        tags: ["error"],
      });
      setServiceError(
        (error as Error)?.message ?? t("tasks.unableUpdateNotifications"),
      );
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationRecord(notificationId);
      await invalidateNotifications();
    } catch (error) {
      logger.error("Error deleting notification:", { error, tags: ["error"] });
      setServiceError(
        (error as Error)?.message ?? t("tasks.unableDeleteNotification"),
      );
    }
  };

  const createNotification = async (input: NewNotificationInput) => {
    try {
      await createTaskNotification(input);
      await invalidateNotifications();
    } catch (error) {
      logger.error("Error creating notification:", { error, tags: ["error"] });
      setServiceError(
        (error as Error)?.message ?? t("tasks.unableCreateNotification"),
      );
    }
  };

  const notifyTaskAssigned = async (
    taskId: string,
    assigneeId: string,
    taskTitle: string,
    assigneeName: string,
  ) => {
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: "task_assigned",
      title: t("tasks.notifyAssigned"),
      message: t("tasks.notifyAssignedMessage", { title: taskTitle }),
      metadata: {
        task_title: taskTitle,
        assignee_name: assigneeName,
      },
    });
  };

  const notifyTaskCompleted = async (
    taskId: string,
    creatorId: string,
    taskTitle: string,
    completedBy: string,
  ) => {
    if (creatorId === user?.id) return;
    await createNotification({
      user_id: creatorId,
      task_id: taskId,
      type: "task_completed",
      title: t("tasks.notifyCompleted"),
      message: t("tasks.notifyCompletedMessage", {
        title: taskTitle,
        name: completedBy,
      }),
      metadata: {
        task_title: taskTitle,
      },
    });
  };

  const notifyTaskStatusChanged = async (
    taskId: string,
    assigneeId: string,
    taskTitle: string,
    newStatus: string,
  ) => {
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: "task_status_changed",
      title: t("tasks.notifyStatusUpdated"),
      message: t("tasks.notifyStatusMessage", {
        title: taskTitle,
        status: translatedStatusLabel(t, newStatus, newStatus.replaceAll("_", " ")),
      }),
      metadata: {
        task_title: taskTitle,
        status: newStatus,
      },
    });
  };

  const notifyTaskComment = async (
    taskId: string,
    assigneeId: string,
    taskTitle: string,
    commenterName: string,
  ) => {
    if (assigneeId === user?.id) return;
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: "task_comment",
      title: t("tasks.notifyComment"),
      message: t("tasks.notifyCommentMessage", {
        name: commenterName,
        title: taskTitle,
      }),
      metadata: {
        task_title: taskTitle,
        comment_author: commenterName,
      },
    });
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    notifyTaskAssigned,
    notifyTaskCompleted,
    notifyTaskStatusChanged,
    notifyTaskComment,
    refetchNotifications: () => notificationsQuery.refetch(),
  };
}
