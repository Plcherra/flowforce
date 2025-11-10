import { useState } from 'react';
import { Bell, BellRing, CheckCircle, Clock, AlertTriangle, User, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { logger } from '@/utils/logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type TaskNotificationsProps = {
  onTaskNavigate?: (taskId: string) => void;
};

export function TaskNotifications({ onTaskNavigate }: TaskNotificationsProps) {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    error,
  } = useTaskNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'task_due_soon':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'task_overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'task_status_changed':
        return <Flag className="h-4 w-4 text-purple-500" />;
      case 'task_comment':
        return <Bell className="h-4 w-4 text-indigo-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
    switch (notification.type) {
      case 'task_assigned':
        return 'New Task Assignment';
      case 'task_due_soon':
        return 'Task Due Soon';
      case 'task_overdue':
        return 'Task Overdue';
      case 'task_completed':
        return 'Task Completed';
      case 'task_status_changed':
        return 'Task Status Updated';
      case 'task_comment':
        return 'New Comment';
      default:
        return 'Task Notification';
    }
  };

  const getDueDateBadge = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    
    if (due < now) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    } else if (isToday(due)) {
      return <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">Due Today</Badge>;
    } else if (isTomorrow(due)) {
      return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">Due Tomorrow</Badge>;
    } else if (isThisWeek(due)) {
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Due This Week</Badge>;
    }
    return null;
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    // Navigate to task or perform action based on notification type
    if (notification.task_id) {
      if (onTaskNavigate) {
        onTaskNavigate(notification.task_id);
        setIsOpen(false);
      } else {
        logger.debug('Navigate to task:', notification.task_id);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          aria-label={unreadCount > 0 ? `${unreadCount} unread task notifications` : 'Open task notifications'}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Task Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <CardDescription>
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </CardDescription>
            )}
          </CardHeader>
          
          <ScrollArea className="h-80">
            <CardContent className="p-0">
              {error && (
                <div className="p-4 pt-0">
                  <Alert variant="destructive">
                    <AlertTitle>Notifications unavailable</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}
              {loading ? (
                <div className="space-y-4 p-4" role="status" aria-live="polite">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground">You'll see task updates here</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          !notification.read_at
                            ? 'bg-primary/5 border-l-2 border-l-primary hover:bg-primary/10'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{getNotificationTitle(notification)}</p>
                              {!notification.read_at && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" aria-hidden />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              {notification.metadata &&
                                typeof notification.metadata === 'object' &&
                                (notification.metadata as any)?.due_date &&
                                getDueDateBadge((notification.metadata as any).due_date)}
                            </div>
                          </div>
                        </div>
                      </button>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
