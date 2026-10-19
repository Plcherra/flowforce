import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { nextWeekdayTime } from "@/features/scheduling/utils/nextWeekdayTime";

export const SCHEDULE_ASSIGNMENT_REMINDER_TYPE = "schedule.assignment";

const scheduleReminderSchema = z
  .object({
    id: z.string(),
    user_id: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    remind_at: z.string().nullable(),
    repeat_interval: z.string().nullable(),
  })
  .passthrough();

export type ScheduleAssignmentReminder = z.infer<typeof scheduleReminderSchema>;

export async function fetchScheduleAssignmentReminders(
  userId?: string | null,
): Promise<ScheduleAssignmentReminder[]> {
  let query = supabase
    .from("reminders")
    .select("id, user_id, title, description, remind_at, repeat_interval, type")
    .eq("type", SCHEDULE_ASSIGNMENT_REMINDER_TYPE)
    .order("remind_at", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return scheduleReminderSchema.array().parse(data ?? []);
}

export async function createScheduleAssignmentReminder(input: {
  userId: string;
  title: string;
  message: string;
  day: string;
  time: string;
}): Promise<void> {
  const remindAt = nextWeekdayTime(input.day, input.time).toISOString();
  const { error } = await supabase.from("reminders").insert({
    user_id: input.userId,
    title: input.title.trim(),
    description: input.message.trim(),
    remind_at: remindAt,
    type: SCHEDULE_ASSIGNMENT_REMINDER_TYPE,
    priority: "normal",
    completed: false,
    repeat_enabled: true,
    repeat_interval: input.day,
    notification_methods: ["in_app"],
    sound_enabled: false,
    sound_type: "default",
    snooze_enabled: false,
    snooze_count: 0,
    auto_complete: false,
  });

  if (error) throw error;
}

export async function deleteScheduleAssignmentReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", id)
    .eq("type", SCHEDULE_ASSIGNMENT_REMINDER_TYPE);

  if (error) throw error;
}
