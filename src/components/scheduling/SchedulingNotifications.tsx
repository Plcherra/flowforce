import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Clock, Calendar } from "lucide-react";
import { useSchedulingReminders } from "@/hooks/useSchedulingReminders";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function SchedulingNotifications() {
  const { toast } = useToast();
  const {
    reminders,
    isEnabled,
    toggleReminder,
    toggleReminders,
    requestNotificationPermission,
    getUpcomingReminders,
  } = useSchedulingReminders();

  const upcomingReminders = getUpcomingReminders();

  const handlePermissionRequest = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll receive scheduling reminders on this device",
      });
    } else {
      toast({
        title: "Notifications denied",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
    }
  };

  const getDayDisplayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Scheduling Notifications
          </div>
          <Switch checked={isEnabled} onCheckedChange={toggleReminders} />
        </CardTitle>
        <CardDescription>
          Automated reminders for your weekly scheduling workflow
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Permission Request */}
        {"Notification" in window && Notification.permission !== "granted" && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm text-amber-800 dark:text-amber-200 mb-1">
                  Enable Browser Notifications
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  Get reminders even when the app is closed
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePermissionRequest}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/20"
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Reminders
            </h3>
            <div className="space-y-2">
              {upcomingReminders.slice(0, 3).map((reminder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{reminder.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {getDayDisplayName(reminder.day)} at {reminder.time}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {format(reminder.date, "MMM d")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminder Settings */}
        <div>
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Reminder Schedule
          </h3>
          <div className="space-y-3">
            {reminders.map((reminder, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {reminder.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getDayDisplayName(reminder.day)} {reminder.time}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reminder.message}
                  </p>
                </div>
                <Switch
                  checked={reminder.enabled && isEnabled}
                  onCheckedChange={(checked) =>
                    toggleReminder(reminder.day, reminder.time, checked)
                  }
                  disabled={!isEnabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Test Notification */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: "Test Notification",
                description: "This is how your scheduling reminders will look",
              });
            }}
            className="w-full"
          >
            Test Notification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
