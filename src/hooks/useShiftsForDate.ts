import { useMemo } from "react";
import { isSameDay, parseISO } from "date-fns";
import { useScheduling } from "@/contexts/SchedulingContext";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";

export interface OnDutyStaff {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string | null;
  shiftIds: string[];
}

export interface UseShiftsForDateResult {
  shifts: ShiftWithAssignments[];
  staff: OnDutyStaff[];
  loading: boolean;
}

const normaliseDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchesStore = (shift: ShiftWithAssignments, storeId?: string | null) => {
  if (!storeId) return true;

  const requirementsStore =
    shift.requirements &&
    typeof shift.requirements === "object" &&
    !Array.isArray(shift.requirements)
      ? (shift.requirements as Record<string, unknown>).store_id
      : null;

  if (typeof requirementsStore === "string" && requirementsStore) {
    return requirementsStore === storeId;
  }

  if (typeof shift.location === "string" && shift.location) {
    return shift.location === storeId;
  }

  return false;
};

const buildStaffMap = (shifts: ShiftWithAssignments[]): OnDutyStaff[] => {
  const staffMap = new Map<string, OnDutyStaff>();

  shifts.forEach((shift) => {
    shift.assignments?.forEach((assignment) => {
      const user = assignment.user;
      if (!user?.id) return;
      const key = user.id;
      const displayName =
        `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
        user.email ||
        "Team member";
      const current = staffMap.get(key);
      if (current) {
        current.shiftIds.push(shift.id);
        return;
      }
      staffMap.set(key, {
        id: key,
        name: displayName,
        avatar_url: user.avatar_url ?? null,
        role: shift.job_position?.name ?? user?.role ?? null,
        shiftIds: [shift.id],
      });
    });
  });

  return Array.from(staffMap.values());
};

export function useShiftsForDate(
  date: Date | string,
  storeId?: string | null,
): UseShiftsForDateResult {
  const targetDate = useMemo(() => normaliseDate(date), [date]);
  const { shifts: allShifts = [], loading } = useScheduling();

  const filteredShifts = useMemo(() => {
    if (!targetDate) return [] as ShiftWithAssignments[];
    return allShifts.filter((shift) => {
      const shiftStart = parseISO(shift.start_time);
      return isSameDay(shiftStart, targetDate) && matchesStore(shift, storeId);
    });
  }, [allShifts, storeId, targetDate]);

  const staff = useMemo(() => buildStaffMap(filteredShifts), [filteredShifts]);

  return {
    shifts: filteredShifts,
    staff,
    loading,
  };
}
