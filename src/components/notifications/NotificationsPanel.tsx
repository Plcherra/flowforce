import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Bell, BellRing, Trash2, Check, Clock, AlertCircle, CheckCircle, Calendar, MessageSquare } from 'lucide-react';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { format, formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

export function NotificationsPanel() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useTaskNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'task_due_soon':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'task_overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'task_status_changed':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'task_comment':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
    switch (notification.type) {
      case 'task_assigned':
        return 'New Task Assignment';
      case 'task_completed':
        return 'Task Completed';
      case 'task_due_soon':
        return 'Task Due Soon';
      case 'task_overdue':
        return 'Task Overdue';
      case 'task_status_changed':
        return 'Task Status Updated';
      case 'task_comment':
        return 'New Comment';
      default:
        return notification.title || 'Notification';
    }
  };

  const getDueDateBadge = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    } else if (diffHours < 24) {
      return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Due Today</Badge>;
    } else if (diffHours < 48) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Due Tomorrow</Badge>;
    }
    return null;
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    // Navigate to task if task_id exists
    if (notification.task_id) {
  // You can implement navigation here
  logger.debug('Navigate to task:', notification.task_id);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAllAsRead()}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 px-4 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div key={notification.id}>
                      <div 
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                          !notification.read_at ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {getNotificationTitle(notification)}
                              </p>
                              <div className="flex items-center space-x-2">
                                {notification.metadata && 
                                 typeof notification.metadata === 'object' && 
                                 'due_date' in notification.metadata &&
                                 notification.metadata.due_date && 
                                 getDueDateBadge(notification.metadata.due_date as string)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              {!notification.read_at && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}