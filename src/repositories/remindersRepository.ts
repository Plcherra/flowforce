import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";

type ReminderRow = Tables<"reminders">;

export type ReminderRecord = Omit<ReminderRow, "notification_methods"> & {
  notification_methods: string[];
};

const reminderRowSchema: z.ZodType<ReminderRow> = z
  .object({
    id: z.string(),
    user_id: z.string(),
    task_id: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    remind_at: z.string(),
    type: z.string(),
    priority: z.string(),
    completed: z.boolean(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    sound_enabled: z.boolean(),
    sound_type: z.string(),
    notification_methods: z.unknown(), // Json type from database, normalized to string[]
    repeat_enabled: z.boolean(),
    repeat_interval: z.string().nullable(),
    snooze_enabled: z.boolean(),
    snooze_count: z.number(),
    auto_complete: z.boolean(),
    last_triggered_at: z.string().nullable(),
    next_reminder_at: z.string().nullable(),
  })
  .passthrough();

const reminderSchema: z.ZodType<ReminderRecord> = reminderRowSchema.transform(
  (reminder) => ({
    ...reminder,
    notification_methods: normalizeNotificationMethods(
      reminder.notification_methods,
    ),
  }),
);

function normalizeNotificationMethods(
  value: ReminderRow["notification_methods"],
): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : ["in_app"];
    } catch {
      return ["in_app"];
    }
  }

  return ["in_app"];
}

export async function fetchRemindersForUser(
  userId: string,
): Promise<ReminderRecord[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("remind_at", { ascending: true });

  if (error) {
    throw error;
  }

  return reminderSchema.array().parse(data ?? []);
}

export type NewReminderInput = Omit<
  ReminderRow,
  "id" | "created_at" | "updated_at"
>;

export async function createReminderRecord(
  input: NewReminderInput,
): Promise<void> {
  const { error } = await supabase.from("reminders").insert(input);

  if (error) {
    throw error;
  }
}

export async function updateReminderRecord(
  id: string,
  updates: Partial<ReminderRow>,
): Promise<void> {
  const { error } = await supabase
    .from("reminders")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteReminderRecord(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
