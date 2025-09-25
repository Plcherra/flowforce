import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface Reminder {
  id: string;
  user_id: string;
  task_id?: string;
  title: string;
  description?: string;
  remind_at: string;
  type: string;
  priority: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  sound_enabled: boolean;
  sound_type: string;
  notification_methods: any; // Using any for now to handle JSON serialization
  repeat_enabled: boolean;
  repeat_interval?: string;
  snooze_enabled: boolean;
  auto_complete: boolean;
  snooze_count: number;
  last_triggered_at?: string;
  next_reminder_at?: string;
}

export function useReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('remind_at', { ascending: true });

      if (error) throw error;

      setReminders((data || []).map(reminder => ({
        ...reminder,
        notification_methods: Array.isArray(reminder.notification_methods) 
          ? reminder.notification_methods 
          : JSON.parse(reminder.notification_methods as string || '["in_app"]')
      })));
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'completed' | 'completed_at'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .insert({
          ...reminderData,
          user_id: user.id
        });

      if (error) throw error;

      await fetchReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      
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
      logger.error('Error triggering reminder:', error);
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
      console.error('Error marking reminder as completed:', error);
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