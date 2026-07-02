import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { ShiftInsertPayload } from "@/features/scheduling/types/mutations";

export interface WeekTemplateShift {
  dayIndex: number;
  startTime: string;
  endTime: string;
  title: string;
  role?: string | null;
  color?: string | null;
  location?: string;
  required_headcount?: number;
  break_minutes?: number;
  hourly_rate?: number | null;
  position_id?: string | null;
  assignee_ids?: string[];
}

export interface WeekTemplateData {
  version: 1;
  shifts: WeekTemplateShift[];
  metadata: {
    total_shifts: number;
    total_hours: number;
    source_week_start?: string;
  };
}

/** Mon=0 … Sun=6 relative to ISO week start (Monday). */
export function dayIndexFromDate(date: Date, weekStart: Date): number {
  for (let i = 0; i < 7; i++) {
    if (isSameDay(addDays(weekStart, i), date)) return i;
  }
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export function isoWeekStartForDate(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function serializeWeekToTemplate(
  weekSchedules: ShiftWithAssignments[],
  weekStart: Date,
): WeekTemplateData {
  let totalHours = 0;
  const shifts: WeekTemplateShift[] = [];

  for (const schedule of weekSchedules) {
    if (!schedule.start_time || !schedule.end_time) continue;
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    const hours = (end.getTime() - start.getTime()) / 36e5;
    if (hours > 0) totalHours += hours;

    shifts.push({
      dayIndex: dayIndexFromDate(start, weekStart),
      startTime: format(start, "HH:mm"),
      endTime: format(end, "HH:mm"),
      title: schedule.title ?? "Shift",
      role: schedule.role,
      color: schedule.color,
      location: schedule.location ?? "",
      required_headcount: schedule.required_headcount ?? 1,
      break_minutes: schedule.break_minutes ?? 0,
      hourly_rate: schedule.hourly_rate,
      position_id: schedule.position_id,
      assignee_ids: (schedule.assignments ?? [])
        .map((a) => a.user_id)
        .filter((id): id is string => Boolean(id)),
    });
  }

  return {
    version: 1,
    shifts,
    metadata: {
      total_shifts: shifts.length,
      total_hours: Math.round(totalHours * 10) / 10,
      source_week_start: format(weekStart, "yyyy-MM-dd"),
    },
  };
}

function parseTimeOnDay(day: Date, time: string): Date {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part, 10));
  const result = new Date(day);
  result.setHours(h ?? 0, m ?? 0, 0, 0);
  return result;
}

export function templateShiftsToInsertPayloads(
  template: WeekTemplateData,
  targetWeekStart: Date,
): ShiftInsertPayload[] {
  return template.shifts.map((row) => {
    const day = addDays(targetWeekStart, row.dayIndex);
    const start = parseTimeOnDay(day, row.startTime);
    let end = parseTimeOnDay(day, row.endTime);
    if (end <= start) {
      end = addDays(end, 1);
    }

    return {
      title: row.title,
      role: row.role ?? null,
      color: row.color ?? "#3b82f6",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: row.location ?? "",
      is_all_day: false,
      timezone: "UTC",
      required_headcount: row.required_headcount ?? 1,
      notes: null,
      break_minutes: row.break_minutes ?? 0,
      hourly_rate: row.hourly_rate ?? null,
      is_published: false,
      is_template: false,
      template_id: null,
      position_id: row.position_id ?? null,
      status: "scheduled",
      user_id: null,
      requirements: [],
    };
  });
}

export function parseWeekTemplateData(raw: unknown): WeekTemplateData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 || !Array.isArray(data.shifts)) return null;
  return data as unknown as WeekTemplateData;
}

export function getTemplateShiftCount(templateData: unknown): number {
  const parsed = parseWeekTemplateData(templateData);
  if (parsed) return parsed.metadata.total_shifts;
  if (rawMetadataCount(templateData)) return rawMetadataCount(templateData)!;
  return 0;
}

function rawMetadataCount(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const meta = (raw as { metadata?: { total_shifts?: number } }).metadata;
  return typeof meta?.total_shifts === "number" ? meta.total_shifts : null;
}
