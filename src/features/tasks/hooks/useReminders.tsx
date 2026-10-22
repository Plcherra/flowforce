import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { logger } from "@/utils/logger";
import {
  createReminderRecord,
  deleteReminderRecord,
  fetchRemindersForUser,
  ReminderRecord,
  updateReminderRecord,
} from "@/features/tasks/repositories/remindersRepository";

export function useReminders() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { i18n } = useTranslation();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { toast } = useToast();
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const invalidatePerformanceDataset = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["performance-dataset"] });
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    if (user) {
      const loadReminders = async () => {
        if (!user || cancelled) return;

        try {
          const data = await fetchRemindersForUser(user.id);
          if (!cancelled) {
            setReminders(data);
          }
        } catch (error) {
          if (!cancelled) {
            logger.error("Error fetching reminders:", { error, tags: ["error"] });
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      loadReminders();
    } else {
      setReminders([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;

    try {
      const data = await fetchRemindersForUser(user.id);
      setReminders(data);
    } catch (error) {
      logger.error("Error fetching reminders:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (
    reminderData: Omit<
      ReminderRecord,
      | "id"
      | "created_at"
      | "updated_at"
      | "user_id"
      | "completed"
      | "completed_at"
    >,
  ) => {
    if (!user) return;

    try {
      await createReminderRecord(
        {
          ...reminderData,
          user_id: user.id,
        },
        companyId ? { companyId, sourceLocale } : undefined,
      );

      await fetchReminders();
      await invalidatePerformanceDataset();
    } catch (error) {
      logger.error("Error creating reminder:", { error, tags: ["error"] });
      throw error;
    }
  };

  const updateReminder = async (
    id: string,
    updates: Partial<ReminderRecord>,
  ) => {
    try {
      await updateReminderRecord(
        id,
        updates,
        companyId ? { companyId, sourceLocale } : undefined,
      );
      await fetchReminders();
      await invalidatePerformanceDataset();
    } catch (error) {
      logger.error("Error updating reminder:", { error, tags: ["error"] });
      throw error;
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await deleteReminderRecord(id);
      setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
      await invalidatePerformanceDataset();

      toast({
        title: "Success",
        description: "Reminder deleted successfully.",
      });
    } catch (error) {
      logger.error("Error deleting reminder:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to delete reminder.",
        variant: "destructive",
      });
    }
  };

  const snoozeReminder = async (id: string, minutes: number = 15) => {
    try {
      const reminder = reminders.find((r) => r.id === id);
      if (!reminder) return;

      const newRemindAt = new Date(Date.now() + minutes * 60 * 1000);

      await updateReminder(id, {
        remind_at: newRemindAt.toISOString(),
        snooze_count: reminder.snooze_count + 1,
        last_triggered_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error snoozing reminder:", { error, tags: ["error"] });
      throw error;
    }
  };

  const triggerReminder = async (
    id: string,
    copy?: { title: string; description: string | null } | null,
  ) => {
    try {
      const reminder = reminders.find((r) => r.id === id);
      if (!reminder) return;

      // Simulate notification trigger based on methods
      if (reminder.notification_methods.includes("browser")) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(copy?.title ?? reminder.title, {
            body: (copy?.description ?? reminder.description) || "Reminder notification",
            icon: "/favicon.ico",
          });
        }
      }

      // Play sound if enabled
      if (reminder.sound_enabled) {
        try {
          const audio = new Audio(`/sounds/${reminder.sound_type}.mp3`);
          audio.play().catch(() => {
            // Fallback to default browser notification sound
            logger.debug("Sound notification triggered");
          });
        } catch (_error) {
          logger.debug("Sound notification triggered (fallback)");
        }
      }

      // Update last triggered time
      await updateReminder(id, {
        last_triggered_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error triggering reminder", { error });
      throw error;
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      await updateReminder(id, {
        completed: true,
        completed_at: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "Reminder marked as completed.",
      });
    } catch (error) {
      logger.error("Error marking reminder as completed", { error });
      toast({
        title: "Error",
        description: "Failed to update reminder.",
        variant: "destructive",
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
    refetchReminders: fetchReminders,
  };
}
