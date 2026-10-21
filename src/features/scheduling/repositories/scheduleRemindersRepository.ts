import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { linkedRecordType } from "@/features/scheduling/utils/linkedScheduleReminder";
import { nextWeekdayTime } from "@/features/scheduling/utils/nextWeekdayTime";
import {
  remindAtForClock,
  type ReminderRepeat,
} from "@/features/scheduling/utils/reminderRepeat";

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

  const [assignments, linkedRecords] = await Promise.all([
    query,
    linkedQuery(userId),
  ]);

  if (assignments.error) throw assignments.error;
  if (linkedRecords.error) throw linkedRecords.error;

  const merged = [...(assignments.data ?? []), ...(linkedRecords.data ?? [])];
  merged.sort((left, right) => {
    const leftTime = left.remind_at ? new Date(left.remind_at).getTime() : 0;
    const rightTime = right.remind_at ? new Date(right.remind_at).getTime() : 0;
    return leftTime - rightTime;
  });
  return scheduleReminderSchema.array().parse(merged);
}

function linkedQuery(userId?: string | null) {
  let query = supabase
    .from("reminders")
    .select("id, user_id, title, description, remind_at, repeat_interval, type")
    .like("type", "record.%")
    .order("remind_at", { ascending: true });
  if (userId) query = query.eq("user_id", userId);
  return query;
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

export async function createFormScheduleReminder(input: {
  userId: string;
  formId: string;
  title: string;
  time: string;
  repeat: ReminderRepeat;
}): Promise<void> {
  const { error } = await supabase.from("reminders").insert({
    user_id: input.userId,
    title: input.title.trim(),
    description: null,
    remind_at: remindAtForClock(input.time).toISOString(),
    type: linkedRecordType("form", input.formId),
    priority: "normal",
    completed: false,
    repeat_enabled: true,
    repeat_interval: input.repeat,
    notification_methods: ["in_app"],
    sound_enabled: false,
    sound_type: "default",
    snooze_enabled: false,
    snooze_count: 0,
    auto_complete: false,
    allow_deactivate: false,
  });

  if (error) throw error;
}

export async function deleteScheduleAssignmentReminder(id: string): Promise<void> {
  const { data, error: readError } = await supabase
    .from("reminders")
    .select("type")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  const type = data?.type ?? "";
  if (
    type !== SCHEDULE_ASSIGNMENT_REMINDER_TYPE &&
    !type.startsWith("record.")
  ) {
    return;
  }
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}
