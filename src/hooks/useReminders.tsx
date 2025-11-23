import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import {
  createReminderRecord,
  deleteReminderRecord,
  fetchRemindersForUser,
  ReminderRecord,
  updateReminderRecord,
} from '@/repositories/remindersRepository';

export function useReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const invalidatePerformanceDataset = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['performance-dataset'] });
  }, [queryClient]);

  useEffect(() => {
    if (user) {
      fetchReminders();
    } else {
      setReminders([]);
      setLoading(false);
    }
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;

    try {
      const data = await fetchRemindersForUser(user.id);
      setReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (
    reminderData: Omit<ReminderRecord, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'completed' | 'completed_at'>
  ) => {
    if (!user) return;

    try {
      await createReminderRecord({
        ...reminderData,
        user_id: user.id,
      });

      await fetchReminders();
      await invalidatePerformanceDataset();
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  };

  const updateReminder = async (id: string, updates: Partial<ReminderRecord>) => {
    try {
      await updateReminderRecord(id, updates);
      await fetchReminders();
      await invalidatePerformanceDataset();
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await deleteReminderRecord(id);
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      await invalidatePerformanceDataset();
      
      toast({
        title: 'Success',
        description: 'Reminder deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reminder.',
        variant: 'destructive',
      });
    }
  };

  const snoozeReminder = async (id: string, minutes: number = 15) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) return;

      const newRemindAt = new Date(Date.now() + minutes * 60 * 1000);
      
      await updateReminder(id, { 
        remind_at: newRemindAt.toISOString(),
        snooze_count: reminder.snooze_count + 1,
        last_triggered_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      throw error;
    }
  };

  const triggerReminder = async (id: string) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) return;

      // Simulate notification trigger based on methods
      if (reminder.notification_methods.includes('browser')) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(reminder.title, {
            body: reminder.description || 'Reminder notification',
            icon: '/favicon.ico'
          });
        }
      }

      // Play sound if enabled
      if (reminder.sound_enabled) {
        try {
          const audio = new Audio(`/sounds/${reminder.sound_type}.mp3`);
          audio.play().catch(() => {
            // Fallback to default browser notification sound
            logger.debug('Sound notification triggered');
          });
        } catch (error) {
          logger.debug('Sound notification triggered (fallback)');
        }
      }

      // Update last triggered time
      await updateReminder(id, {
        last_triggered_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error triggering reminder', { error });
      throw error;
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      await updateReminder(id, { 
        completed: true,
        completed_at: new Date().toISOString()
      });
      
      toast({
        title: 'Success',
        description: 'Reminder marked as completed.',
      });
    } catch (error) {
      logger.error('Error marking reminder as completed', { error });
      toast({
        title: 'Error',
        description: 'Failed to update reminder.',
        variant: 'destructive',
      });
    }
  };

  return {
    reminders,
    loading,
    createReminder,
    updateReminder,
    deleteReminder,
    markAsCompleted,
    snoozeReminder,
    triggerReminder,
    refetchReminders: fetchReminders
  };
}
