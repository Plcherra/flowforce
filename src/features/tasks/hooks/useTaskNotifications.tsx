import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
} from '@/repositories/taskNotificationsRepository';

const NOTIFICATION_QUERY_KEY = 'task-notifications';

export function useTaskNotifications() {
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

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );
  const loading = notificationsQuery.isLoading && Boolean(user);
  const queryError = notificationsQuery.error ? (notificationsQuery.error as Error).message : null;
  const error = serviceError ?? queryError;

  const invalidateNotifications = () => {
    if (!user?.id) return Promise.resolve();
    return queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEY, user.id] });
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`task-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            try {
              const notification = payload.new as TaskNotification;
              toast({
                title: notification.title,
                description: notification.message,
                duration: 5000,
              });
              invalidateNotifications();
            } catch (error) {
              const errorMessage = error instanceof Error 
                ? error.message 
                : typeof error === 'object' && error !== null && 'message' in error
                  ? String(error.message)
                  : 'Unknown error handling notification';
              console.error('Error handling notification INSERT:', errorMessage, error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'task_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            try {
              invalidateNotifications();
            } catch (error) {
              console.error('Error handling notification UPDATE:', error);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // Successfully subscribed
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`Task notifications subscription ${status}:`, err);
          }
        });
    } catch (error) {
      console.error('Error setting up task notifications subscription:', error);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
        let errorMessage = 'Unable to check due tasks.';
        
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (error && typeof error === 'object') {
          // Try to extract message from error object
          if ('message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
          } else if ('error' in error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if ('code' in error) {
            errorMessage = `Error code: ${String(error.code)}`;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Only log if there's a meaningful error message
        if (errorMessage !== 'Unable to check due tasks.' || error) {
          console.error('Error checking due tasks:', errorMessage, error);
        }
        
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
  }, [user?.id]);

  const checkDueTasks = async (userId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const lastDayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const dueSoon = await fetchTasksDueSoon(userId, tomorrow.toISOString());
    for (const task of dueSoon) {
      if (!task.due_date) continue;
      const existing = await findRecentNotification(userId, task.id, 'task_due_soon', lastDayIso);
      if (!existing) {
        await createTaskNotification({
          user_id: userId,
          task_id: task.id,
          type: 'task_due_soon',
          title: 'Task Due Soon',
          message: `"${task.title}" is due soon`,
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
      const existing = await findRecentNotification(userId, task.id, 'task_overdue', lastDayIso);
      if (!existing) {
        await createTaskNotification({
          user_id: userId,
          task_id: task.id,
          type: 'task_overdue',
          title: 'Task Overdue',
          message: `"${task.title}" is overdue`,
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
      console.error('Error marking notification as read:', error);
      setServiceError((error as Error)?.message ?? 'Unable to update notification.');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.id);
      await invalidateNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setServiceError((error as Error)?.message ?? 'Unable to update notifications.');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationRecord(notificationId);
      await invalidateNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      setServiceError((error as Error)?.message ?? 'Unable to delete notification.');
    }
  };

  const createNotification = async (input: NewNotificationInput) => {
    try {
      await createTaskNotification(input);
      await invalidateNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
      setServiceError((error as Error)?.message ?? 'Unable to create notification.');
    }
  };

  const notifyTaskAssigned = async (taskId: string, assigneeId: string, taskTitle: string, assigneeName: string) => {
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: 'task_assigned',
      title: 'New Task Assignment',
      message: `You have been assigned to "${taskTitle}"`,
      metadata: {
        task_title: taskTitle,
        assignee_name: assigneeName,
      },
    });
  };

  const notifyTaskCompleted = async (taskId: string, creatorId: string, taskTitle: string, completedBy: string) => {
    if (creatorId === user?.id) return;
    await createNotification({
      user_id: creatorId,
      task_id: taskId,
      type: 'task_completed',
      title: 'Task Completed',
      message: `"${taskTitle}" has been completed by ${completedBy}`,
      metadata: {
        task_title: taskTitle,
      },
    });
  };

  const notifyTaskStatusChanged = async (taskId: string, assigneeId: string, taskTitle: string, newStatus: string) => {
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: 'task_status_changed',
      title: 'Task Status Updated',
      message: `"${taskTitle}" status changed to ${newStatus.replace('_', ' ')}`,
      metadata: {
        task_title: taskTitle,
        status: newStatus,
      },
    });
  };

  const notifyTaskComment = async (taskId: string, assigneeId: string, taskTitle: string, commenterName: string) => {
    if (assigneeId === user?.id) return;
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: 'task_comment',
      title: 'New Comment',
      message: `${commenterName} commented on "${taskTitle}"`,
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
