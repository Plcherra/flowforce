import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, addDays, startOfWeek } from 'date-fns';

interface ReminderSchedule {
  day: string;
  title: string;
  message: string;
  time: string;
  enabled: boolean;
}

const defaultReminders: ReminderSchedule[] = [
  {
    day: 'thursday',
    title: 'Staff Availability Reminder',
    message: 'Please update your availability by tonight for next week\'s schedule.',
    time: '10:00',
    enabled: true,
  },
  {
    day: 'friday',
    title: 'Schedule Building',
    message: 'Time to collect availability updates and build the draft schedule.',
    time: '09:00',
    enabled: true,
  },
  {
    day: 'saturday',
    title: 'Schedule Review',
    message: 'Review and finalize the schedule for publication.',
    time: '09:00',
    enabled: true,
  },
  {
    day: 'saturday',
    title: 'Schedule Publication',
    message: 'Post the finalized schedule to all channels.',
    time: '14:00',
    enabled: true,
  },
  {
    day: 'sunday',
    title: 'Week Start Reminder',
    message: 'Schedule starts tomorrow. Please review your shifts.',
    time: '18:00',
    enabled: true,
  },
];

export function useSchedulingReminders() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<ReminderSchedule[]>(defaultReminders);
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem('scheduling-reminders-enabled');
    return stored ? JSON.parse(stored) : true;
  });

  // Check for due reminders
  useEffect(() => {
    if (!isEnabled) return;

    const checkReminders = () => {
      const now = new Date();
      const today = format(now, 'EEEE').toLowerCase();
      const currentTime = format(now, 'HH:mm');
      
      reminders.forEach((reminder) => {
        if (reminder.enabled && reminder.day === today) {
          const reminderKey = `reminder-${reminder.day}-${reminder.time}-${format(now, 'yyyy-MM-dd')}`;
          const wasShown = localStorage.getItem(reminderKey);
          
          if (!wasShown && currentTime >= reminder.time) {
            showReminder(reminder);
            localStorage.setItem(reminderKey, 'true');
          }
        }
      });
    };

    // Check immediately
    checkReminders();

    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminders, isEnabled, toast]);

  const showReminder = (reminder: ReminderSchedule) => {
    toast({
      title: reminder.title,
      description: reminder.message,
      duration: 10000, // 10 seconds
    });

    // Browser notification if supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(reminder.title, {
        body: reminder.message,
        icon: '/favicon.ico',
      });
    }
  };

  const toggleReminder = (day: string, time: string, enabled: boolean) => {
    setReminders(prev => 
      prev.map(r => 
        r.day === day && r.time === time 
          ? { ...r, enabled }
          : r
      )
    );
  };

  const toggleReminders = (enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('scheduling-reminders-enabled', JSON.stringify(enabled));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const upcoming: Array<ReminderSchedule & { date: Date }> = [];

    reminders.forEach((reminder) => {
      if (!reminder.enabled) return;
      
      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(reminder.day);
      const reminderDate = addDays(weekStart, dayIndex);
      const [hours, minutes] = reminder.time.split(':').map(Number);
      reminderDate.setHours(hours, minutes, 0, 0);
      
      if (reminderDate > now) {
        upcoming.push({ ...reminder, date: reminderDate });
      }
    });

    return upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  return {
    reminders,
    isEnabled,
    toggleReminder,
    toggleReminders,
    requestNotificationPermission,
    getUpcomingReminders,
    showReminder,
  };
}