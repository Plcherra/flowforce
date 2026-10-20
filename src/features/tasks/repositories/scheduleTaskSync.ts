/**
 * Keep schedule-linked task rows aligned with the shift they came from.
 * A missing task row is a no-op. These helpers never delete tasks.
 */

import { supabase } from "@/integrations/supabase/client";
import { dueDateFromShiftEnd } from "@/features/tasks/utils/scheduleTaskLink";

export function linkedTaskFieldsForShift(
  endIso: string | null | undefined,
  assigneeIds: Array<string | null | undefined>,
): { due_date: string; assigned_to: string | null } {
  const dueDate = dueDateFromShiftEnd(endIso);
  if (!dueDate) {
    throw new Error("Shift end time is missing.");
  }
  const assignedTo =
    assigneeIds.find((id) => typeof id === "string" && id.trim() !== "") ??
    null;
  return {
    due_date: dueDate,
    assigned_to: assignedTo ? assignedTo.trim() : null,
  };
}

async function loadShiftForTaskSync(shiftId: string) {
  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .select("end_time")
    .eq("id", shiftId)
    .maybeSingle();
  if (scheduleError) throw scheduleError;
  if (!schedule) {
    throw new Error("Shift not found.");
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("schedule_assignments")
    .select("user_id")
    .eq("schedule_id", shiftId)
    .order("created_at", { ascending: true });
  if (assignmentError) throw assignmentError;

  return linkedTaskFieldsForShift(
    schedule.end_time,
    (assignments ?? []).map((row) => row.user_id),
  );
}

export async function refreshTasksForShift(shiftId: string): Promise<void> {
  if (!shiftId.trim()) return;
  const fields = await loadShiftForTaskSync(shiftId);
  const { error } = await supabase
    .from("tasks")
    .update({
      due_date: fields.due_date,
      assigned_to: fields.assigned_to,
    })
    .eq("source", "schedule")
    .filter("links->>schedule_id", "eq", shiftId);
  if (error) throw error;
}

export async function cancelTasksForShift(shiftId: string): Promise<void> {
  if (!shiftId.trim()) return;
  const { error } = await supabase
    .from("tasks")
    .update({ status: "cancelled" })
    .eq("source", "schedule")
    .filter("links->>schedule_id", "eq", shiftId);
  if (error) throw error;
}
