import {
  CHECKLIST_SLOTS,
  type ChecklistArea,
  type ChecklistSlot,
} from "@/features/forms/utils/checklistForms";
import { listsForShift } from "@/features/forms/utils/shiftChecklistLists";
import {
  carryClosingNotes,
  type AreaShift,
} from "@/features/forms/utils/closingNotes";
import {
  matchesWeekday,
  readShiftWeekdayTask,
  type StoreStation,
  type Weekday,
} from "./shiftWeekdayTask";
import { readAssigneeIds, readFormId } from "./shiftTaskWrite";
import { readTaskSchedule } from "./taskSchedule";
import { readFormDistribution } from "@/features/forms/utils/formDistribution";
import { shiftDayPhase } from "@/features/forms/utils/formDayWindow";
import {
  roleListsForShift,
  scheduledRoleIds,
  type ScheduledPosition,
  type ScheduledRole,
} from "./scheduledRoleLists";

const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export function weekdayFromDate(date: Date): Weekday {
  return WEEKDAY_BY_JS_DAY[date.getDay()] ?? "mon";
}

export function checklistAreaFromShift(input: {
  role?: string | null;
  title?: string | null;
}): ChecklistArea | null {
  const role = `${input.role ?? ""}`.toLowerCase();
  const title = `${input.title ?? ""}`.toLowerCase();
  if (/\bcashier\b/.test(role)) return "cashier";
  if (/\bsupervisor\b/.test(role)) return "supervisor";
  if (/\bcashier\b/.test(title)) return "cashier";
  if (/\bsupervisor\b/.test(title)) return "supervisor";
  return null;
}

export type MyShiftChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type MyShiftListView = {
  slot: ChecklistSlot;
  formId: string | null;
  title: string | null;
  notes: string[];
  savedNote: string;
  items: MyShiftChecklistItem[];
};

export type MyShiftRoleList = {
  formId: string;
  title: string | null;
  items: MyShiftChecklistItem[];
  phase: "open" | "due";
  dueTime: string | null;
};

export type MyShiftWeekdayCard = {
  id: string;
  title: string;
  stations: StoreStation[];
};

export type MyShiftShiftCard = {
  id: string;
  title: string;
  description: string;
  formId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  assigneeCount: number;
  status: string | null;
};

export type MyShiftView = {
  area: ChecklistArea | null;
  lists: MyShiftListView[];
  roleLists: MyShiftRoleList[];
  weekdayTasks: MyShiftWeekdayCard[];
  shiftTasks: MyShiftShiftCard[];
};

export type MyShiftSchedule = {
  id: string;
  role: string | null;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  user_id: string | null;
  is_published: boolean | null;
  is_template: boolean | null;
  position_id?: string | null;
};

export type MyShiftForm = {
  id: string;
  title?: string | null;
  settings?: unknown;
  status?: string | null;
};

export type MyShiftField = {
  id: string;
  form_id: string | null;
  label: string | null;
  field_order: number | null;
};

export type MyShiftSubmission = {
  form_id: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  submission_data: unknown;
};

export type MyShiftTaskRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  links?: unknown;
};

export function readAdditionalInformation(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const value = (data as Record<string, unknown>).additional_information;
  return typeof value === "string" ? value.trim() : "";
}

export function fieldIsDone(data: unknown, fieldId: string): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const value = (data as Record<string, unknown>)[fieldId];
  if (value === true || value === "yes" || value === "true" || value === "done") {
    return true;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const inner = (value as Record<string, unknown>).value;
    return inner === true || inner === "yes" || inner === "done";
  }
  return false;
}

export function isWorkShift(row: {
  is_published?: boolean | null;
  is_template?: boolean | null;
}): boolean {
  return row.is_template !== true && row.is_published !== false;
}

function dayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function overlapsToday(
  startIso: string | null,
  endIso: string | null,
  now: Date,
): boolean {
  if (!startIso) return false;
  const startMs = new Date(startIso).getTime();
  if (Number.isNaN(startMs)) return false;
  const endMs = endIso ? new Date(endIso).getTime() : startMs + 60 * 60 * 1000;
  const { start, end } = dayBounds(now);
  return startMs < end.getTime() && endMs > start.getTime();
}

function chooseCoveringShift(
  rows: readonly MyShiftSchedule[],
  now: Date,
): MyShiftSchedule | null {
  if (rows.length === 0) return null;
  const nowMs = now.getTime();
  const covering = rows.find((row) => {
    const startMs = new Date(row.start_time ?? "").getTime();
    const endMs = row.end_time
      ? new Date(row.end_time).getTime()
      : startMs + 60 * 60 * 1000;
    return startMs <= nowMs && nowMs <= endMs;
  });
  const pool = covering ? [covering] : rows;
  return [...pool].sort((left, right) =>
    `${left.start_time ?? ""}`.localeCompare(`${right.start_time ?? ""}`),
  )[0];
}

function pickViewerShift(
  schedules: readonly MyShiftSchedule[],
  viewerId: string,
  now: Date,
): MyShiftSchedule | null {
  const mine = schedules.filter(
    (row) =>
      row.user_id === viewerId &&
      isWorkShift(row) &&
      overlapsToday(row.start_time, row.end_time, now),
  );
  const mapped = mine.filter((row) => checklistAreaFromShift(row) !== null);
  return chooseCoveringShift(mapped.length > 0 ? mapped : mine, now);
}

export function shiftTaskMarkDoneAllowed(
  status: string | null | undefined,
): boolean {
  return status !== "done" && status !== "completed" && status !== "cancelled";
}

export function shiftTasksForSchedule(
  tasks: readonly MyShiftTaskRow[],
  scheduleId: string,
): MyShiftShiftCard[] {
  return tasks.flatMap((task) => {
    if (readShiftWeekdayTask(task.links)) return [];
    if (!task.links || typeof task.links !== "object" || Array.isArray(task.links)) {
      return [];
    }
    const scheduleIdOnTask = (task.links as { schedule_id?: unknown }).schedule_id;
    if (typeof scheduleIdOnTask !== "string" || scheduleIdOnTask !== scheduleId) {
      return [];
    }
    const schedule = readTaskSchedule(task.links);
    return [
      {
        id: task.id,
        title: task.title?.trim() || "",
        description: task.description?.trim() || "",
        formId: readFormId(task.links),
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        assigneeCount: readAssigneeIds(task.links, task.assigned_to).length,
        status: task.status ?? null,
      },
    ];
  });
}

function openingNotes(input: {
  area: ChecklistArea;
  viewerId: string;
  viewerStartsAt: string;
  schedules: readonly MyShiftSchedule[];
  submissions: readonly MyShiftSubmission[];
  closingFormId: string | null;
}): string[] {
  if (!input.closingFormId) return [];
  const latest = input.submissions
    .filter(
      (row) =>
        row.form_id === input.closingFormId &&
        row.submitted_at &&
        row.submitted_at < input.viewerStartsAt &&
        readAdditionalInformation(row.submission_data).length > 0,
    )
    .sort((left, right) =>
      `${right.submitted_at ?? ""}`.localeCompare(`${left.submitted_at ?? ""}`),
    )[0];
  if (!latest?.submitted_at) return [];
  const note = readAdditionalInformation(latest.submission_data);
  const shifts: AreaShift[] = input.schedules
    .filter(
      (row) =>
        isWorkShift(row) &&
        checklistAreaFromShift(row) === input.area &&
        Boolean(row.user_id) &&
        Boolean(row.start_time),
    )
    .map((row) => ({
      area: input.area,
      slot: "opening" as const,
      personId: row.user_id ?? "",
      startsAt: row.start_time ?? "",
    }));
  const carried = carryClosingNotes({
    area: input.area,
    notes: [note],
    shifts,
    closingEndsAt: latest.submitted_at,
  });
  if (carried.personId !== input.viewerId) return [];
  return carried.notes;
}

function latestViewerSubmission(
  submissions: readonly MyShiftSubmission[],
  formId: string,
  viewerId: string,
  shiftStart: string,
  shiftEnd: string | null,
): MyShiftSubmission | null {
  const endMs = shiftEnd
    ? new Date(shiftEnd).getTime()
    : Number.POSITIVE_INFINITY;
  const startMs = new Date(shiftStart).getTime();
  return (
    submissions
      .filter((row) => {
        if (row.form_id !== formId || row.submitted_by !== viewerId) return false;
        if (!row.submitted_at) return false;
        const at = new Date(row.submitted_at).getTime();
        return at >= startMs && at <= endMs;
      })
      .sort((left, right) =>
        `${right.submitted_at ?? ""}`.localeCompare(`${left.submitted_at ?? ""}`),
      )[0] ?? null
  );
}

function checklistItems(
  fields: readonly MyShiftField[],
  submissions: readonly MyShiftSubmission[],
  formId: string,
  viewerId: string,
  shiftStart: string | null,
  shiftEnd: string | null,
): MyShiftChecklistItem[] {
  const submission = shiftStart
    ? latestViewerSubmission(submissions, formId, viewerId, shiftStart, shiftEnd)
    : null;
  return fields
    .filter((field) => field.form_id === formId)
    .sort((left, right) => (left.field_order ?? 0) - (right.field_order ?? 0))
    .map((field) => ({
      id: field.id,
      label: field.label?.trim() || field.id,
      done: fieldIsDone(submission?.submission_data, field.id),
    }));
}

export type AssembledShift =
  | { kind: "empty" }
  | { kind: "unmapped" }
  | {
      kind: "ready";
      view: MyShiftView;
      shiftTitle: string;
      shiftStartsAt: string;
      shiftEndsAt: string | null;
    };

export function assembleMyShift(input: {
  viewerId: string;
  now: Date;
  schedules: readonly MyShiftSchedule[];
  forms: readonly MyShiftForm[];
  fields: readonly MyShiftField[];
  submissions: readonly MyShiftSubmission[];
  tasks: readonly MyShiftTaskRow[];
  roles?: readonly ScheduledRole[];
  positions?: readonly ScheduledPosition[];
}): AssembledShift {
  const hasShift = input.schedules.some(
    (row) =>
      row.user_id === input.viewerId &&
      isWorkShift(row) &&
      overlapsToday(row.start_time, row.end_time, input.now),
  );
  const shift = pickViewerShift(input.schedules, input.viewerId, input.now);
  if (!shift) return hasShift ? { kind: "unmapped" } : { kind: "empty" };
  const area = checklistAreaFromShift(shift);
  const shiftTasks = shiftTasksForSchedule(input.tasks, shift.id);
  const todaysShifts = input.schedules.filter(
    (row) =>
      row.user_id === input.viewerId &&
      isWorkShift(row) &&
      overlapsToday(row.start_time, row.end_time, input.now),
  );
  const roleIds = [
    ...new Set(
      todaysShifts.flatMap((row) =>
        scheduledRoleIds({
          role: row.role,
          positionId: row.position_id,
          roles: input.roles ?? [],
          positions: input.positions ?? [],
        }),
      ),
    ),
  ];
  const slotForms = area ? listsForShift(input.forms, area) : null;
  const shown = new Set(
    slotForms
      ? CHECKLIST_SLOTS.map((slot) => slotForms[slot]?.id).filter(
          (id): id is string => Boolean(id),
        )
      : [],
  );
  const roleForms = roleListsForShift(input.forms, roleIds, input.now, shown);
  const { start: dayStart, end: dayEnd } = dayBounds(input.now);
  const roleLists = roleForms.flatMap((form) => {
    const distribution = readFormDistribution(form.settings);
    const items = checklistItems(
      input.fields,
      input.submissions,
      form.id,
      input.viewerId,
      dayStart.toISOString(),
      dayEnd.toISOString(),
    );
    const finished =
      items.length > 0
        ? items.every((item) => item.done)
        : latestViewerSubmission(
            input.submissions,
            form.id,
            input.viewerId,
            dayStart.toISOString(),
            dayEnd.toISOString(),
          ) != null;
    if (
      distribution.timeMode === "shift_day" &&
      !distribution.completeBy &&
      finished
    ) {
      return [];
    }
    const phase = shiftDayPhase(distribution, input.now);
    return [
      {
        formId: form.id,
        title: form.title ?? null,
        items,
        phase: phase === "due" ? ("due" as const) : ("open" as const),
        dueTime: distribution.dueTime,
      },
    ];
  });
  if (!area || !shift.start_time) {
    if (shiftTasks.length === 0 && roleLists.length === 0) return { kind: "unmapped" };
    return {
      kind: "ready",
      view: { area: null, lists: [], roleLists, weekdayTasks: [], shiftTasks },
      shiftTitle: shift.title?.trim() || shift.role?.trim() || "",
      shiftStartsAt: shift.start_time ?? "",
      shiftEndsAt: shift.end_time,
    };
  }

  const lists = slotForms ?? listsForShift(input.forms, area);
  const notes = openingNotes({
    area,
    viewerId: input.viewerId,
    viewerStartsAt: shift.start_time,
    schedules: input.schedules,
    submissions: input.submissions,
    closingFormId: lists.closing?.id ?? null,
  });
  const weekday = weekdayFromDate(input.now);
  const view: MyShiftView = {
    area,
    roleLists,
    lists: CHECKLIST_SLOTS.map((slot) => {
      const form = lists[slot];
      const items = form
        ? checklistItems(
            input.fields,
            input.submissions,
            form.id,
            input.viewerId,
            shift.start_time,
            shift.end_time,
          )
        : [];
      const submission = form
        ? latestViewerSubmission(
            input.submissions,
            form.id,
            input.viewerId,
            shift.start_time ?? "",
            shift.end_time,
          )
        : null;
      return {
        slot,
        formId: form?.id ?? null,
        title: form?.title ?? null,
        notes: slot === "opening" ? notes : [],
        savedNote:
          slot === "closing"
            ? readAdditionalInformation(submission?.submission_data)
            : "",
        items,
      };
    }),
    shiftTasks,
    weekdayTasks: input.tasks.flatMap((task) => {
      const weekdayTask = readShiftWeekdayTask(task.links);
      if (!weekdayTask || weekdayTask.area !== area) return [];
      if (!matchesWeekday(weekdayTask, weekday)) return [];
      return [
        {
          id: task.id,
          title: weekdayTask.title,
          stations: weekdayTask.stations,
        },
      ];
    }),
  };

  return {
    kind: "ready",
    view,
    shiftTitle: shift.title?.trim() || shift.role?.trim() || area,
    shiftStartsAt: shift.start_time,
    shiftEndsAt: shift.end_time,
  };
}
