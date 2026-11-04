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
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { useReminders } from "@/features/tasks/hooks/useReminders";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
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
    snooze_enabled: true,
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
        sound_enabled: false,
        sound_type: "default",
        notification_methods: ["in_app"],
        repeat_enabled: false,
        repeat_interval: "none",
        snooze_enabled: formData.snooze_enabled,
        auto_complete: false,
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
        snooze_enabled: true,
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
                (reminderInterval === "custom" && !reminderDate)
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
