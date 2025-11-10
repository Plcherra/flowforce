import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/public-types';
type TaskNotification = Tables<'task_notifications'>;

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    let isActive = true;
    const initialize = async () => {
      await fetchNotifications();
      if (isActive) {
        await checkDueTasks();
      }
    };

    initialize();
    const cleanup = subscribeToNotifications();

    // Check for due tasks periodically
    const interval = setInterval(checkDueTasks, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      isActive = false;
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read_at).length);
      setError(null);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error instanceof Error ? error.message : 'Unexpected error loading notifications.');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('task-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as TaskNotification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notifications
          toast({
            title: newNotification.title,
            description: newNotification.message,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as TaskNotification;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          if (updatedNotification.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkDueTasks = async () => {
    if (!user) return;

    try {
      // Check for tasks due in the next 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: dueSoonTasks, error: dueSoonError } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, assigned_to')
        .eq('assigned_to', user.id)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', tomorrow.toISOString())
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .neq('status', 'done');

      if (dueSoonError) throw dueSoonError;

      // Check for overdue tasks
      const { data: overdueTasks, error: overdueError } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, assigned_to')
        .eq('assigned_to', user.id)
        .lt('due_date', new Date().toISOString())
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .neq('status', 'done');

      if (overdueError) throw overdueError;

      // Create notifications for due soon tasks
      for (const task of dueSoonTasks || []) {
        // Check if notification already exists for this task
        const { data: existingNotification } = await supabase
          .from('task_notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('task_id', task.id)
          .eq('type', 'task_due_soon')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .single();

        if (!existingNotification) {
          await createNotification({
            user_id: user.id,
            task_id: task.id,
            type: 'task_due_soon',
            title: 'Task Due Soon',
            message: `"${task.title}" is due soon`,
            metadata: {
              task_title: task.title,
              priority: task.priority,
              due_date: task.due_date
            }
          });
        }
      }

      // Create notifications for overdue tasks
      for (const task of overdueTasks || []) {
        // Check if notification already exists for this task
        const { data: existingNotification } = await supabase
          .from('task_notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('task_id', task.id)
          .eq('type', 'task_overdue')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .single();

        if (!existingNotification) {
          await createNotification({
            user_id: user.id,
            task_id: task.id,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `"${task.title}" is overdue`,
            metadata: {
              task_title: task.title,
              priority: task.priority,
              due_date: task.due_date
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking due tasks:', error);
      setError((error as Error)?.message ?? 'Unable to check due tasks.');
    }
  };

  const createNotification = async (notificationData: Omit<TaskNotification, 'id' | 'created_at' | 'read_at'>) => {
    try {
      const { error } = await supabase
        .from('task_notifications')
        .insert(notificationData);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
      setError((error as Error)?.message ?? 'Unable to create notification.');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('task_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError((error as Error)?.message ?? 'Unable to update notification.');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('task_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError((error as Error)?.message ?? 'Unable to update notifications.');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('task_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read_at ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError((error as Error)?.message ?? 'Unable to delete notification.');
    }
  };

  // Function to create notifications for task events
  const notifyTaskAssigned = async (taskId: string, assigneeId: string, taskTitle: string, assigneeName: string) => {
    await createNotification({
      user_id: assigneeId,
      task_id: taskId,
      type: 'task_assigned',
      title: 'New Task Assignment',
      message: `You have been assigned to "${taskTitle}"`,
      metadata: {
        task_title: taskTitle,
        assignee_name: assigneeName
      }
    });
  };

  const notifyTaskCompleted = async (taskId: string, creatorId: string, taskTitle: string, completedBy: string) => {
    if (creatorId !== user?.id) {
      await createNotification({
        user_id: creatorId,
        task_id: taskId,
        type: 'task_completed',
        title: 'Task Completed',
        message: `"${taskTitle}" has been completed by ${completedBy}`,
        metadata: {
          task_title: taskTitle
        }
      });
    }
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
        status: newStatus
      }
    });
  };

  const notifyTaskComment = async (taskId: string, assigneeId: string, taskTitle: string, commenterName: string) => {
    if (assigneeId !== user?.id) {
      await createNotification({
        user_id: assigneeId,
        task_id: taskId,
        type: 'task_comment',
        title: 'New Comment',
        message: `${commenterName} commented on "${taskTitle}"`,
        metadata: {
          task_title: taskTitle,
          comment_author: commenterName
        }
      });
    }
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
    refetchNotifications: fetchNotifications
  };
}
