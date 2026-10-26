import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  Bell,
  Volume2,
  Mail,
  Smartphone,
  Monitor,
} from "lucide-react";
import { format } from "date-fns";
import { useReminders } from "@/features/tasks/hooks/useReminders";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/utils/logger";

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
}

export function CreateReminderDialog({
  open,
  onOpenChange,
  taskId,
}: CreateReminderDialogProps) {
  const { t } = useTranslation();
  const { createReminder } = useReminders();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderInterval, setReminderInterval] = useState("custom");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "custom",
    priority: "medium",
    sound_enabled: true,
    sound_type: "default",
    notification_methods: ["in_app", "browser"],
    repeat_enabled: false,
    repeat_interval: "none",
    snooze_enabled: true,
    auto_complete: false,
  });

  const calculateReminderDate = () => {
    if (reminderInterval === "custom") return reminderDate;

    const now = new Date();
    const intervals = {
      "15min": 15 * 60 * 1000,
      "30min": 30 * 60 * 1000,
      "1hour": 60 * 60 * 1000,
      "2hours": 2 * 60 * 60 * 1000,
      "1day": 24 * 60 * 60 * 1000,
      "2days": 2 * 24 * 60 * 60 * 1000,
      "1week": 7 * 24 * 60 * 60 * 1000,
    };

    return new Date(
      now.getTime() + intervals[reminderInterval as keyof typeof intervals],
    );
  };

  const toggleNotificationMethod = (method: string) => {
    setFormData((prev) => ({
      ...prev,
      notification_methods: prev.notification_methods.includes(method)
        ? prev.notification_methods.filter((m) => m !== method)
        : [...prev.notification_methods, method],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReminderDate = calculateReminderDate();
    if (!formData.title.trim() || !finalReminderDate) return;

    setLoading(true);
    try {
      let finalDateTime = finalReminderDate;

      if (reminderInterval === "custom" && reminderTime) {
        const [hours, minutes] = reminderTime.split(":").map(Number);
        finalDateTime = new Date(finalReminderDate);
        finalDateTime.setHours(hours, minutes, 0, 0);
      }

      await createReminder({
        title: formData.title,
        description: formData.description || null,
        remind_at: finalDateTime.toISOString(),
        type: formData.type,
        priority: formData.priority,
        task_id: taskId || null,
        sound_enabled: formData.sound_enabled,
        sound_type: formData.sound_type,
        notification_methods: formData.notification_methods,
        repeat_enabled: formData.repeat_enabled,
        repeat_interval: formData.repeat_interval,
        snooze_enabled: formData.snooze_enabled,
        auto_complete: formData.auto_complete,
        snooze_count: 0,
        last_triggered_at: null,
        next_reminder_at: null,
      });

      toast({
        title: t("tasks.reminderCreated"),
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        type: "custom",
        priority: "medium",
        sound_enabled: true,
        sound_type: "default",
        notification_methods: ["in_app", "browser"],
        repeat_enabled: false,
        repeat_interval: "none",
        snooze_enabled: true,
        auto_complete: false,
      });
      setReminderDate(undefined);
      setReminderTime("09:00");
      setReminderInterval("custom");
      onOpenChange(false);
    } catch (error) {
      logger.error("Error creating reminder:", { error, tags: ["error"] });
      toast({
        title: t("tasks.errorTitle"),
        description: t("tasks.reminderFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("tasks.createReminder")}</DialogTitle>
          <DialogDescription>
            {t("tasks.setUpAReminderToHelpYouStay")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("tasks.title")}</Label>
            <Input
              id="title"
              placeholder={t("tasks.enterReminderTitle")}
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("tasks.description")}</Label>
            <Textarea
              id="description"
              placeholder={t("tasks.enterReminderDescription")}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("tasks.reminderTime")}</Label>
              <Select
                value={reminderInterval}
                onValueChange={setReminderInterval}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("tasks.selectTiming")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15min">{t("tasks.text15MinutesFromNow")}</SelectItem>
                  <SelectItem value="30min">{t("tasks.text30MinutesFromNow")}</SelectItem>
                  <SelectItem value="1hour">{t("tasks.text1HourFromNow")}</SelectItem>
                  <SelectItem value="2hours">{t("tasks.text2HoursFromNow")}</SelectItem>
                  <SelectItem value="1day">{t("tasks.text1DayFromNow")}</SelectItem>
                  <SelectItem value="2days">{t("tasks.text2DaysFromNow")}</SelectItem>
                  <SelectItem value="1week">{t("tasks.text1WeekFromNow")}</SelectItem>
                  <SelectItem value="custom">{t("tasks.customDateTime")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t("tasks.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("tasks.selectPriority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("tasks.low")}</SelectItem>
                  <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
                  <SelectItem value="high">{t("tasks.high")}</SelectItem>
                  <SelectItem value="urgent">{t("tasks.urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {reminderInterval === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("tasks.reminderDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reminderDate
                        ? format(reminderDate, "PPP")
                        : t("tasks.pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reminderDate}
                      onSelect={setReminderDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">{t("tasks.reminderTime2")}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sound Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {t("tasks.soundNotifications")}
            </Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t("tasks.enableSound")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("tasks.playSoundWhenReminderTriggers")}
                </p>
              </div>
              <Switch
                checked={formData.sound_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, sound_enabled: checked }))
                }
              />
            </div>

            {formData.sound_enabled && (
              <div className="space-y-2">
                <Label htmlFor="sound-type">{t("tasks.soundType")}</Label>
                <Select
                  value={formData.sound_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, sound_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.selectSound")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      {t("tasks.defaultNotification")}
                    </SelectItem>
                    <SelectItem value="chime">{t("tasks.softChime")}</SelectItem>
                    <SelectItem value="bell">{t("tasks.bell")}</SelectItem>
                    <SelectItem value="alert">{t("tasks.alertTone")}</SelectItem>
                    <SelectItem value="gentle">{t("tasks.gentleReminder")}</SelectItem>
                    <SelectItem value="urgent">{t("tasks.urgentAlert")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notification Methods */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {t("tasks.notificationMethods")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("tasks.chooseHowYouWantToReceiveThisReminder")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes("in_app")
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground"
                }`}
                onClick={() => toggleNotificationMethod("in_app")}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("tasks.inApp")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.showInNotificationsPanel")}
                </p>
              </div>

              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes("browser")
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground"
                }`}
                onClick={() => toggleNotificationMethod("browser")}
              >
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("tasks.browserPush")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.browserNotificationPopup")}
                </p>
              </div>

              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes("email")
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground"
                }`}
                onClick={() => toggleNotificationMethod("email")}
              >
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("tasks.email")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.sendEmailReminder")}
                </p>
              </div>

              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.notification_methods.includes("mobile")
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground"
                }`}
                onClick={() => toggleNotificationMethod("mobile")}
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("tasks.mobilePush")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.mobileAppNotification")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {formData.notification_methods.map((method) => (
                <Badge key={method} variant="secondary" className="text-xs">
                  {method === "in_app"
                    ? t("tasks.inApp")
                    : method === "browser"
                      ? t("tasks.browserPush")
                      : method === "email"
                        ? t("tasks.email")
                        : t("tasks.mobilePush")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t("tasks.advancedOptions")}</Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">{t("tasks.repeatReminder")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("tasks.repeatThisReminderAtIntervals")}
                  </p>
                </div>
                <Switch
                  checked={formData.repeat_enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      repeat_enabled: checked,
                    }))
                  }
                />
              </div>

              {formData.repeat_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="repeat-interval">{t("tasks.repeatEvery")}</Label>
                  <Select
                    value={formData.repeat_interval}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        repeat_interval: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("tasks.selectInterval")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5min">{t("tasks.text5Minutes")}</SelectItem>
                      <SelectItem value="15min">{t("tasks.text15Minutes")}</SelectItem>
                      <SelectItem value="30min">{t("tasks.text30Minutes")}</SelectItem>
                      <SelectItem value="1hour">{t("tasks.text1Hour")}</SelectItem>
                      <SelectItem value="daily">{t("tasks.daily")}</SelectItem>
                      <SelectItem value="weekly">{t("tasks.weekly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">{t("tasks.enableSnooze")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("tasks.allowSnoozingThisReminder")}
                  </p>
                </div>
                <Switch
                  checked={formData.snooze_enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      snooze_enabled: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">{t("tasks.autoComplete")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("tasks.markAsCompletedWhenTaskIsDone")}
                  </p>
                </div>
                <Switch
                  checked={formData.auto_complete}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, auto_complete: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("tasks.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.title.trim() ||
                (reminderInterval === "custom" && !reminderDate) ||
                formData.notification_methods.length === 0
              }
            >
              {loading ? t("tasks.creating") : t("tasks.createReminder")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
