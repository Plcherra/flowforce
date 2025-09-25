import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Bell, Calendar, Trash2, CheckCircle, Volume2, Repeat, Timer, Play } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { useReminders } from '@/hooks/useReminders';
import { CreateReminderDialog } from './CreateReminderDialog';
import { useToast } from '@/hooks/use-toast';

export function RemindersPanel() {
  const { reminders, loading, deleteReminder, markAsCompleted, snoozeReminder, triggerReminder } = useReminders();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const getUpcomingReminders = () => {
    return reminders
      .filter(reminder => !reminder.completed && new Date(reminder.remind_at) > new Date())
      .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
      .slice(0, 5);
  };

  const getOverdueReminders = () => {
    return reminders.filter(reminder => 
      !reminder.completed && isPast(new Date(reminder.remind_at))
    );
  };

  const getReminderBadge = (remindAt: string) => {
    const reminderDate = new Date(remindAt);
    
    if (isPast(reminderDate)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    } else if (isToday(reminderDate)) {
      return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Today</Badge>;
    } else if (isTomorrow(reminderDate)) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Tomorrow</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
  };

  const getNotificationMethodIcons = (methods: string[]) => {
    const iconMap = {
      in_app: <Bell className="h-3 w-3" />,
      browser: <Clock className="h-3 w-3" />,
      email: <span className="text-xs">@</span>,
      mobile: <span className="text-xs">📱</span>
    };
    
    return methods.map(method => (
      <span key={method} className="inline-flex items-center text-muted-foreground" title={method}>
        {iconMap[method as keyof typeof iconMap]}
      </span>
    ));
  };

  const handleSnooze = async (reminderId: string) => {
    try {
      await snoozeReminder(reminderId, 15); // Snooze for 15 minutes
      toast({
        title: 'Reminder Snoozed',
        description: 'Reminder will appear again in 15 minutes.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to snooze reminder.',
        variant: 'destructive',
      });
    }
  };

  const handleTestReminder = async (reminderId: string) => {
    try {
      await triggerReminder(reminderId);
      toast({
        title: 'Test Notification',
        description: 'Test reminder notification sent!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification.',
        variant: 'destructive',
      });
    }
  };

  const upcomingReminders = getUpcomingReminders();
  const overdueReminders = getOverdueReminders();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            Reminders
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overdue Reminders */}
              {overdueReminders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">Overdue</h4>
                  {overdueReminders.map((reminder) => (
                    <div key={reminder.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-l-red-500 mb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {reminder.title}
                            </p>
                             {reminder.sound_enabled && (
                               <Volume2 className="h-3 w-3 text-muted-foreground" />
                             )}
                             {reminder.repeat_enabled && (
                               <Repeat className="h-3 w-3 text-muted-foreground" />
                             )}
                          </div>
                          {reminder.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              {getReminderBadge(reminder.remind_at)}
                              <span className="text-xs text-gray-500">
                                {format(new Date(reminder.remind_at), 'MMM dd, h:mm a')}
                              </span>
                              <div className="flex items-center space-x-1">
                                {getNotificationMethodIcons(reminder.notification_methods)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {reminder.snooze_enabled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSnooze(reminder.id)}
                                  title="Snooze for 15 minutes"
                                >
                                  <Timer className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleTestReminder(reminder.id)}
                                title="Test notification"
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => markAsCompleted(reminder.id)}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => deleteReminder(reminder.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Reminders */}
              {upcomingReminders.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upcoming</h4>
                  {upcomingReminders.map((reminder) => (
                    <div key={reminder.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {reminder.title}
                            </p>
                             {reminder.sound_enabled && (
                               <Volume2 className="h-3 w-3 text-muted-foreground" />
                             )}
                             {reminder.repeat_enabled && (
                               <Repeat className="h-3 w-3 text-muted-foreground" />
                             )}
                          </div>
                          {reminder.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              {getReminderBadge(reminder.remind_at)}
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true })}
                              </span>
                              <div className="flex items-center space-x-1">
                                {getNotificationMethodIcons(reminder.notification_methods)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleTestReminder(reminder.id)}
                                title="Test notification"
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => markAsCompleted(reminder.id)}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => deleteReminder(reminder.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming reminders</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create your first reminder
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CreateReminderDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </Card>
  );
}