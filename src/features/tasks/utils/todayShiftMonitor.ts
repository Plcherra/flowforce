import {
  CHECKLIST_SLOTS,
  type ChecklistArea,
  type ChecklistSlot,
} from "@/features/forms/utils/checklistForms";
import { listsForShift } from "@/features/forms/utils/shiftChecklistLists";
import {
  checklistAreaFromShift,
  fieldIsDone,
  isWorkShift,
  readAdditionalInformation,
  type MyShiftField,
  type MyShiftForm,
  type MyShiftSchedule,
  type MyShiftSubmission,
} from "./myShiftView";

export type TodayListProgress = {
  slot: ChecklistSlot;
  formId: string | null;
  title: string | null;
  done: number;
  total: number;
  note: string;
};

export type TodayShiftRow = {
  shiftId: string;
  personId: string | null;
  shiftTitle: string;
  area: ChecklistArea | null;
  lists: TodayListProgress[];
};

function overlapsToday(startIso: string | null, endIso: string | null, now: Date): boolean {
  if (!startIso) return false;
  const startMs = new Date(startIso).getTime();
  if (Number.isNaN(startMs)) return false;
  const endMs = endIso ? new Date(endIso).getTime() : startMs + 60 * 60 * 1000;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return startMs < end.getTime() && endMs > start.getTime();
}

function latestInShift(
  submissions: readonly MyShiftSubmission[],
  formId: string,
  personId: string | null,
  shiftStart: string,
  shiftEnd: string | null,
): MyShiftSubmission | null {
  if (!personId) return null;
  const startMs = new Date(shiftStart).getTime();
  const endMs = shiftEnd ? new Date(shiftEnd).getTime() : Number.POSITIVE_INFINITY;
  return (
    submissions
      .filter((row) => {
        if (row.form_id !== formId || row.submitted_by !== personId || !row.submitted_at) {
          return false;
        }
        const at = new Date(row.submitted_at).getTime();
        return at >= startMs && at <= endMs;
      })
      .sort((left, right) =>
        `${right.submitted_at ?? ""}`.localeCompare(`${left.submitted_at ?? ""}`),
      )[0] ?? null
  );
}

export function todayShiftProgress(input: {
  now: Date;
  schedules: readonly MyShiftSchedule[];
  forms: readonly MyShiftForm[];
  fields: readonly MyShiftField[];
  submissions: readonly MyShiftSubmission[];
}): TodayShiftRow[] {
  return input.schedules
    .filter(
      (row) =>
        isWorkShift(row) && overlapsToday(row.start_time, row.end_time, input.now),
    )
    .sort((left, right) =>
      `${left.start_time ?? ""}`.localeCompare(`${right.start_time ?? ""}`),
    )
    .map((shift) => {
      const area = checklistAreaFromShift(shift);
      const lists = area ? listsForShift(input.forms, area) : null;
      return {
        shiftId: shift.id,
        personId: shift.user_id,
        shiftTitle: shift.title?.trim() || shift.role?.trim() || shift.id,
        area,
        lists: area
          ? CHECKLIST_SLOTS.map((slot) => {
              const form = lists?.[slot] ?? null;
              const submission =
                form && shift.start_time
                  ? latestInShift(
                      input.submissions,
                      form.id,
                      shift.user_id,
                      shift.start_time,
                      shift.end_time,
                    )
                  : null;
              const fields = form
                ? input.fields.filter((field) => field.form_id === form.id)
                : [];
              return {
                slot,
                formId: form?.id ?? null,
                title: form?.title ?? null,
                done: fields.filter((field) =>
                  fieldIsDone(submission?.submission_data, field.id),
                ).length,
                total: fields.length,
                note:
                  slot === "closing"
                    ? readAdditionalInformation(submission?.submission_data)
                    : "",
              };
            })
          : [],
      };
    });
}
