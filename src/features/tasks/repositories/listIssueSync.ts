import { supabase } from "@/integrations/supabase/client";
import {
  collectListIssues,
  readListFormIds,
  type ListIssueShift,
  type ListIssueSubmission,
} from "@/features/tasks/utils/listIssues";
import {
  listIssueKeyFromLinks,
  newListIssueDrafts,
} from "@/features/tasks/utils/listIssueInsert";

export async function syncListIssueTasks(
  companyId: string,
  createdBy: string,
): Promise<number> {
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 14);

  const { data: schedules, error: scheduleError } = await supabase
    .from("schedules")
    .select("id, title, start_time, end_time, requirements, user_id")
    .eq("company_id", companyId)
    .gte("end_time", since.toISOString())
    .lte("end_time", now.toISOString());
  if (scheduleError) throw scheduleError;

  const scheduleIds = (schedules ?? []).map((row) => row.id);
  const assigneesByShift = new Map<string, string[]>();
  if (scheduleIds.length > 0) {
    const { data: assignments, error: assignmentError } = await supabase
      .from("schedule_assignments")
      .select("schedule_id, user_id")
      .in("schedule_id", scheduleIds);
    if (assignmentError) throw assignmentError;
    for (const row of assignments ?? []) {
      if (!row.schedule_id || !row.user_id) continue;
      const list = assigneesByShift.get(row.schedule_id) ?? [];
      list.push(row.user_id);
      assigneesByShift.set(row.schedule_id, list);
    }
  }

  const shifts: ListIssueShift[] = [];
  for (const row of schedules ?? []) {
    const listFormIds = readListFormIds(row.requirements);
    if (listFormIds.length === 0 || !row.start_time || !row.end_time) continue;
    const fromAssignments = assigneesByShift.get(row.id) ?? [];
    const assigneeIds = fromAssignments.length > 0
      ? fromAssignments
      : row.user_id
        ? [row.user_id]
        : [];
    if (assigneeIds.length === 0) continue;
    shifts.push({
      id: row.id,
      title: row.title,
      start: row.start_time,
      end: row.end_time,
      assigneeIds,
      listFormIds,
    });
  }
  if (shifts.length === 0) return 0;

  const formIds = Array.from(new Set(shifts.flatMap((shift) => shift.listFormIds)));
  const [{ data: fields, error: fieldError }, { data: submissions, error: submissionError }, { data: tasks, error: taskError }] =
    await Promise.all([
      supabase.from("form_fields").select("id, form_id, label, is_required").in("form_id", formIds),
      supabase
        .from("form_submissions")
        .select("form_id, submitted_by, submitted_at, submission_data")
        .in("form_id", formIds),
      supabase.from("tasks").select("links").eq("company_id", companyId).eq("source", "form"),
    ]);
  if (fieldError) throw fieldError;
  if (submissionError) throw submissionError;
  if (taskError) throw taskError;

  const parsedSubmissions: ListIssueSubmission[] = (submissions ?? []).map((row) => ({
    formId: row.form_id ?? "",
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    answers:
      row.submission_data && typeof row.submission_data === "object" && !Array.isArray(row.submission_data)
        ? (row.submission_data as Record<string, unknown>)
        : {},
  }));
  const drafts = collectListIssues({
    shifts,
    fields: (fields ?? []).map((field) => ({
      id: field.id,
      formId: field.form_id ?? "",
      label: field.label ?? "Item",
      required: Boolean(field.is_required),
    })),
    submissions: parsedSubmissions,
    now,
  });
  const existingKeys = (tasks ?? [])
    .map((task) => listIssueKeyFromLinks(task.links))
    .filter((key): key is string => Boolean(key));
  const fresh = newListIssueDrafts(drafts, existingKeys);
  if (fresh.length === 0) return 0;

  const { error: insertError } = await supabase.from("tasks").insert(
    fresh.map((item) => ({
      title: item.title,
      description: item.description,
      status: item.status,
      source: item.source,
      priority: item.priority,
      due_date: item.due_date,
      assigned_to: item.assigned_to,
      links: item.links,
      created_by: createdBy,
      company_id: companyId,
    })),
  );
  if (insertError) throw insertError;
  return fresh.length;
}
