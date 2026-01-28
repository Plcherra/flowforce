/**
 * Utility functions for week operations
 */

import { startOfWeek, endOfWeek } from "date-fns";
import type { ShiftInsertPayload } from "../types/mutations";

/**
 * Calculate week range from a reference date
 */
export function calculateWeekRange(referenceDate: Date) {
  const start = startOfWeek(referenceDate);
  const end = endOfWeek(start);
  return { start, end };
}

/**
 * Copy shifts from one week to another
 */
export function prepareShiftCopies(
  sourceShifts: Array<{
    title?: string | null;
    role?: string | null;
    color?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    is_all_day?: boolean | null;
    timezone?: string | null;
    required_headcount?: number | null;
    notes?: string | null;
    break_minutes?: number | null;
    hourly_rate?: number | null;
    position_id?: string | null;
    status?: string | null;
    requirements?: unknown[] | null;
  }>,
  sourceWeekStart: Date,
  targetWeekStart: Date,
): ShiftInsertPayload[] {
  const offset = targetWeekStart.getTime() - sourceWeekStart.getTime();

  return sourceShifts
    .filter((row) => row.start_time && row.end_time)
    .map<ShiftInsertPayload>((row) => {
      const start = new Date(row.start_time!);
      const end = new Date(row.end_time!);
      const nextStart = new Date(start.getTime() + offset);
      const nextEnd = new Date(end.getTime() + offset);
      return {
        title: row.title ?? "Shift",
        role: row.role,
        color: row.color ?? "#3b82f6",
        start_time: nextStart.toISOString(),
        end_time: nextEnd.toISOString(),
        location: row.location ?? "",
        is_all_day: row.is_all_day ?? false,
        timezone: row.timezone ?? "UTC",
        required_headcount: row.required_headcount ?? 1,
        notes: row.notes ?? null,
        break_minutes: row.break_minutes ?? 0,
        hourly_rate: row.hourly_rate ?? null,
        is_published: false,
        is_template: false,
        template_id: null,
        position_id: row.position_id ?? null,
        status: row.status ?? "scheduled",
        user_id: null,
        requirements: row.requirements ?? [],
      };
    });
}
