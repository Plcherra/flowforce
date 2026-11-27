import type { TFunction } from "i18next";
import type { Json } from "@/integrations/supabase/public-types"; // pragma: allowlist secret
import {
  buildDuePayload,
  type TaskDueShape,
} from "@/features/tasks/utils/taskDueTiming";
import {
  dueDateFromWindowEnd,
  fromDatetimeLocalValue,
  mergeTaskSchedule,
  withTaskPoints,
  type TaskPublishState,
} from "@/features/tasks/utils/taskSchedule";
import {
  taskAudienceJson,
  taskAudienceReady,
  type TaskAudience,
} from "@/features/tasks/utils/taskAudience";
import type { TaskDueByValue } from "@/features/tasks/components/TaskDueByFields";

export type CreateTaskFormData = {
  title: string;
  description: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  publish_state: TaskPublishState;
  points: string;
  assigned_to: string;
};

export function validateCreateTaskForm(input: {
  formData: CreateTaskFormData;
  dueBy: TaskDueByValue;
  viewAudience: TaskAudience;
  editAudience: TaskAudience;
  onlySelf: boolean;
  scope: unknown;
  t: TFunction;
}): Record<string, string> {
  const { formData, dueBy, viewAudience, editAudience, onlySelf, scope, t } =
    input;
  const nextErrors: Record<string, string> = {};
  if (!formData.title.trim()) {
    nextErrors.title = t("tasks.aTitleIsRequired");
  }
  if (!onlySelf && scope && !formData.assigned_to) {
    nextErrors.assigned_to = t("tasks.chooseAssignee");
  }
  if (!taskAudienceReady(viewAudience) || !taskAudienceReady(editAudience)) {
    nextErrors.audience = t("tasks.audienceNeedsAChoice");
  }
  if (formData.points.trim() !== "" && !/^\d+$/.test(formData.points.trim())) {
    nextErrors.points = t("tasks.pointsMustBeWholeNumber");
  }
  if (dueBy.enabled && (!dueBy.dateYmd.trim() || !dueBy.timeHm.trim())) {
    nextErrors.due_by = t("tasks.dueByIncomplete");
  }
  if (formData.starts_at || formData.ends_at) {
    const startsAt = fromDatetimeLocalValue(formData.starts_at);
    const endsAt = fromDatetimeLocalValue(formData.ends_at);
    if (!startsAt || !endsAt) {
      nextErrors.ends_at = t("tasks.windowNeedsStartAndEnd");
    } else if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      nextErrors.ends_at = t("tasks.endMustBeAfterStart");
    }
  }
  return nextErrors;
}

export function buildCreateTaskInsert(input: {
  formData: CreateTaskFormData;
  dueBy: TaskDueByValue;
  shopTimeZone: string;
  userId: string;
  onlySelf: boolean;
  viewAudience: TaskAudience;
  editAudience: TaskAudience;
}): {
  row: Record<string, unknown>;
  due: TaskDueShape;
} {
  const startsAt = fromDatetimeLocalValue(input.formData.starts_at);
  const endsAt = fromDatetimeLocalValue(input.formData.ends_at);
  const points =
    input.formData.points.trim() === "" ? null : Number(input.formData.points);
  const dueFields = buildDuePayload({
    dueByEnabled: input.dueBy.enabled,
    dueByDate: input.dueBy.dateYmd,
    dueByTime: input.dueBy.timeHm,
    timeZone: input.shopTimeZone,
    windowDueDate: dueDateFromWindowEnd(endsAt),
  });
  return {
    due: dueFields,
    row: {
      title: input.formData.title,
      description: input.formData.description || null,
      status: "todo",
      priority: input.formData.priority,
      created_by: input.userId,
      due_date: dueFields.due_date,
      due_at: dueFields.due_at,
      links: withTaskPoints(
        mergeTaskSchedule(null, {
          startsAt,
          endsAt,
          publishState: input.formData.publish_state,
        }),
        points,
      ),
      assigned_to: input.onlySelf
        ? input.userId
        : input.formData.assigned_to
          ? input.formData.assigned_to
          : null,
      view_audience: taskAudienceJson(input.viewAudience) as Json,
      edit_audience: taskAudienceJson(input.editAudience) as Json,
      departmentid: null,
      tags: null,
      attachments: [],
      parent_task_id: null,
      workflowid: null,
      actual_hours: null,
      goal_id: null,
    },
  };
}