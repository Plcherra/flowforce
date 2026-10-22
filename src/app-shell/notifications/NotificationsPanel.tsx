import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellRing,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { useTaskNotifications } from "@/features/tasks";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/utils/logger";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function NotificationsPanel({
  embedded = false,
  onUnreadCount,
}: {
  embedded?: boolean;
  onUnreadCount?: (count: number) => void;
}) {
  const { t } = useTranslation();
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
      case "task_assigned":
        return <AlertCircle className="h-4 w-4 text-primary" />;
      case "task_completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "task_due_soon":
        return <Clock className="h-4 w-4 text-warning" />;
      case "task_overdue":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "task_status_changed":
        return <MessageSquare className="h-4 w-4 text-secondary" />;
      case "task_comment":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
    switch (notification.type) {
      case "task_assigned":
        return "New Task Assignment";
      case "task_completed":
        return "Task Completed";
      case "task_due_soon":
        return "Task Due Soon";
      case "task_overdue":
        return "Task Overdue";
      case "task_status_changed":
        return "Task Status Updated";
      case "task_comment":
        return "New Comment";
      default:
        return notification.title || "Notification";
    }
  };

  const getDueDateBadge = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t("shell.overdue")}
        </Badge>
      );
    } else if (diffHours < 24) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-warning-muted text-warning-foreground"
        >
          {t("shell.dueToday")}
        </Badge>
      );
    } else if (diffHours < 48) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-warning-muted text-warning-foreground"
        >
          {t("shell.dueTomorrow")}
        </Badge>
      );
    }
    return null;
  };

  useEffect(() => {
    onUnreadCount?.(unreadCount);
  }, [onUnreadCount, unreadCount]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    // Navigate to task if task_id exists
    if (notification.task_id) {
      // You can implement navigation here
      logger.debug("Navigate to task", {
        context: { taskId: notification.task_id },
      });
    }
  };

  const inbox = (
        <Card className={embedded ? "border-0 shadow-none" : "border-0 shadow-lg"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("shell.notifications")}</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-xs"
                >
                  {t("shell.markAllRead")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={embedded ? "h-56" : "h-80"}>
              {error && (
                <div className="px-4">
                  <Alert variant="destructive">
                    <AlertTitle>{t("shell.notificationsUnavailable")}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 px-4 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("shell.noNotificationsYet")}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div key={notification.id}>
                      <div
                        className={`p-4 hover:bg-muted cursor-pointer transition-colors ${
                          !notification.read_at
                            ? "bg-primary/10 border-l-4 border-l-primary"
                            : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground truncate">
                                {getNotificationTitle(notification)}
                              </p>
                              <div className="flex items-center space-x-2">
                                {notification.metadata &&
                                  typeof notification.metadata === "object" &&
                                  "due_date" in notification.metadata &&
                                  notification.metadata.due_date &&
                                  getDueDateBadge(
                                    notification.metadata.due_date as string,
                                  )}
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
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(notification.created_at),
                                  { addSuffix: true },
                                )}
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
                                  {t("shell.markRead")}
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
  );

  if (embedded) return inbox;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={t("shell.notifications")}>
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {inbox}
      </PopoverContent>
    </Popover>
  );
}
