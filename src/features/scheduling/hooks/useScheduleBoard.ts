import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useProfile } from "@/hooks/useProfile";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type {
  VendorEventWithMetadata,
  ProfileSummary,
} from "./useSchedulingConsolidated";
import { buildCellAvailabilityMap } from "@/features/scheduling/services/availability/scheduleAvailabilityEngine";
import type { GridCellAvailability } from "@/types/platform";
import { logger } from "@/utils/logger";
import {
  buildConflictByShiftId,
  buildShiftsByDay,
  buildShiftsByEmployeeDay,
} from "@/features/scheduling/utils/gridIndexes";
import {
  calculateDailyGridStats,
} from "@/features/scheduling/utils/hoursCalculation";

interface LocationOption {
  id: string;
  name: string;
}

interface VendorPaletteItemContext {
  id: string;
  label: string;
  vendorType: string;
  color: string;
  defaultDurationHours: number;
}

interface PendingVendorEvent {
  vendor: VendorPaletteItemContext;
  start: Date;
  end: Date;
}

interface UseScheduleBoardParams {
  selectedDate: Date;
  locationFilter?: string;
  pendingVendorEvent?: PendingVendorEvent | null;
}

type BasicEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export function useScheduleBoard({
  selectedDate,
  locationFilter,
  pendingVendorEvent,
}: UseScheduleBoardParams) {
  const {
    shifts,
    assignments,
    timeOff: timeOffRequests,
    unavailability,
    staffAvailability,
    vendorEvents,
    loading,
    refetchAll,
    mutations,
    teamMembers,
  } = useScheduling();
  const {
    createSchedule,
    updateSchedule,
    assign,
    unassign,
    createVendorEvent,
    clearWeek,
    addUnavailability,
    requestTimeOff,
    bulkCreateShifts,
    copyWeek,
    publishWeek,
  } = mutations;
  const { profile } = useProfile();

  const companyId = profile?.companyId ?? null;

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);
  const [showAvailabilityLayer, setShowAvailabilityLayer] = useState(true);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const formattedWeekStart = useMemo(
    () => format(weekStart, "yyyy-MM-dd"),
    [weekStart],
  );
  const formattedWeekEnd = useMemo(
    () => format(weekEnd, "yyyy-MM-dd"),
    [weekEnd],
  );
  const previousWeekStart = useMemo(() => addDays(weekStart, -7), [weekStart]);
  const formattedPreviousWeekStart = useMemo(
    () => format(previousWeekStart, "yyyy-MM-dd"),
    [previousWeekStart],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const hours = useMemo(
    () => Array.from({ length: 17 }, (_, index) => index + 6),
    [],
  );

  const employees = useMemo<BasicEmployee[]>(() => {
    const map = new Map<string, BasicEmployee>();

    const addProfile = (profile?: ProfileSummary | null) => {
      if (!profile?.id) return;
      if (map.has(profile.id)) return;
      map.set(profile.id, {
        id: profile.id,
        first_name: profile.first_name ?? "Team",
        last_name: profile.last_name ?? "Member",
        avatar_url: profile.avatar_url ?? null,
      });
    };

    (teamMembers ?? []).forEach((member) => addProfile(member));
    assignments.forEach((assignment) => addProfile(assignment.user));
    timeOffRequests.forEach((request) => addProfile(request.user));
    unavailability.forEach((entry) => addProfile(entry.user));

    return Array.from(map.values()).sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB);
    });
  }, [assignments, teamMembers, timeOffRequests, unavailability]);

  const fetchLocations = useCallback(async () => {
    if (!companyId) {
      setLocations([]);
      return;
    }

    setIsLocationsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inv_locations")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        logger.error("Failed to load locations", { error, tags: ["error"] });
        return;
      }

      setLocations(data ?? []);
    } finally {
      setIsLocationsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchLocations().catch(() => {
      /* handled in fetchLocations */
    });
  }, [fetchLocations]);

  const filteredSchedules = useMemo<ShiftWithAssignments[]>(
    () =>
      shifts.filter((schedule) => {
        if (!locationFilter) return true;
        return (schedule.location ?? "") === locationFilter;
      }),
    [locationFilter, shifts],
  );

  const weekSchedules = useMemo<ShiftWithAssignments[]>(
    () =>
      filteredSchedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.start_time);
        return weekDays.some((day) => isSameDay(scheduleDate, day));
      }),
    [filteredSchedules, weekDays],
  );

  const vendorEventsThisWeek = useMemo(() => {
    return vendorEvents.filter((event) => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      return eventDate >= weekStart && eventDate < weekEnd;
    });
  }, [vendorEvents, weekEnd, weekStart]);

  const unassignedShifts = useMemo(() => {
    return weekDays.map((day) => ({
      day,
      shifts: weekSchedules.filter((schedule) => {
        const start = new Date(schedule.start_time);
        return (
          isSameDay(start, day) && (schedule.assignments?.length ?? 0) === 0
        );
      }),
    }));
  }, [weekDays, weekSchedules]);

  const vendorEventsByShift = useMemo(() => {
    const map = new Map<string, VendorEventWithMetadata[]>();
    vendorEventsThisWeek.forEach((event) => {
      if (!event.shift_id) return;
      const list = map.get(event.shift_id) ?? [];
      list.push(event);
      map.set(event.shift_id, list);
    });
    return map;
  }, [vendorEventsThisWeek]);

  const weekCsvRows = useMemo(() => {
    return [
      [
        "Title",
        "Location",
        "Start",
        "End",
        "Published",
        "Required",
        "Assigned",
      ],
      ...weekSchedules.map((schedule) => [
        schedule.title ?? "",
        schedule.location ?? "",
        format(new Date(schedule.start_time), "yyyy-MM-dd HH:mm"),
        format(new Date(schedule.end_time), "yyyy-MM-dd HH:mm"),
        schedule.is_published ? "Yes" : "No",
        schedule.required_headcount ?? 1,
        schedule.assignments?.length ?? 0,
      ]),
    ];
  }, [weekSchedules]);

  const weekCsvContent = useMemo(
    () =>
      weekCsvRows
        .map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n"),
    [weekCsvRows],
  );

  const weekCsvFilename = useMemo(
    () => `schedule-week-${formattedWeekStart}.csv`,
    [formattedWeekStart],
  );

  const copyPreviousWeek = useCallback(async () => {
    await copyWeek({
      sourceWeekStart: formattedPreviousWeekStart,
      targetWeekStart: formattedWeekStart,
    });
  }, [copyWeek, formattedPreviousWeekStart, formattedWeekStart]);

  const clearCurrentWeek = useCallback(async () => {
    await clearWeek({
      weekStart: formattedWeekStart,
      weekEnd: formattedWeekEnd,
    });
  }, [clearWeek, formattedWeekEnd, formattedWeekStart]);

  const publishWeekStatus = useCallback(
    async (isPublished: boolean) => {
      await publishWeek({
        weekStart: formattedWeekStart,
        weekEnd: formattedWeekEnd,
        isPublished,
      });
    },
    [formattedWeekEnd, formattedWeekStart, publishWeek],
  );

  const cellAvailability = useMemo(
    () =>
      buildCellAvailabilityMap({
        employeeIds: employees.map((employee) => employee.id),
        weekDays,
        staffAvailability,
        timeOff: timeOffRequests,
        unavailability,
      }),
    [
      employees,
      weekDays,
      staffAvailability,
      timeOffRequests,
      unavailability,
    ],
  );

  const getCellAvailability = useCallback(
    (employeeId: string, day: Date): GridCellAvailability | undefined =>
      cellAvailability.get(employeeId)?.get(day.toISOString().slice(0, 10)),
    [cellAvailability],
  );

  const employeeIds = useMemo(
    () => employees.map((employee) => employee.id),
    [employees],
  );

  const shiftsByEmployeeDay = useMemo(
    () => buildShiftsByEmployeeDay(weekSchedules, weekDays, employeeIds),
    [weekSchedules, weekDays, employeeIds],
  );

  const shiftsByDay = useMemo(
    () => buildShiftsByDay(weekSchedules, weekDays),
    [weekSchedules, weekDays],
  );

  const conflictByShiftId = useMemo(
    () => buildConflictByShiftId(weekSchedules, cellAvailability),
    [weekSchedules, cellAvailability],
  );

  const dailyGridStats = useMemo(
    () => calculateDailyGridStats(weekSchedules, weekDays),
    [weekSchedules, weekDays],
  );

  const candidateVendorShifts = useMemo<ShiftWithAssignments[]>(() => {
    if (!pendingVendorEvent) return [];

    const priorityRoles = ["supervisor", "manager"];

    return weekSchedules
      .filter((schedule) => {
        const scheduleStart = new Date(schedule.start_time);
        const scheduleEnd = new Date(schedule.end_time);
        return (
          isSameDay(scheduleStart, pendingVendorEvent.start) &&
          scheduleStart < pendingVendorEvent.end &&
          scheduleEnd > pendingVendorEvent.start
        );
      })
      .sort((a, b) => {
        const roleA = a.role?.toLowerCase?.() ?? "";
        const roleB = b.role?.toLowerCase?.() ?? "";
        const priorityA = priorityRoles.indexOf(roleA);
        const priorityB = priorityRoles.indexOf(roleB);

        if (priorityA === priorityB) {
          return (
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
        }
        if (priorityA === -1) return 1;
        if (priorityB === -1) return -1;
        return priorityA - priorityB;
      });
  }, [pendingVendorEvent, weekSchedules]);

  return {
    companyId,
    employees,
    assignments,
    schedules: shifts,
    timeOffRequests,
    unavailability,
    vendorEvents,
    vendorEventsThisWeek,
    filteredSchedules,
    weekSchedules,
    unassignedShifts,
    weekStart,
    weekEnd,
    previousWeekStart,
    weekDays,
    hours,
    formattedWeekStart,
    formattedWeekEnd,
    formattedPreviousWeekStart,
    weekCsvContent,
    weekCsvFilename,
    locations,
    isLocationsLoading,
    refreshLocations: fetchLocations,
    candidateVendorShifts,
    vendorEventsByShift,
    cellAvailability,
    getCellAvailability,
    shiftsByEmployeeDay,
    shiftsByDay,
    conflictByShiftId,
    dailyGridStats,
    showAvailabilityLayer,
    setShowAvailabilityLayer,
    loading,
    actions: {
      createSchedule,
      updateSchedule,
      assign,
      unassign,
      createVendorEvent,
      clearWeek,
      addUnavailability,
      requestTimeOff,
      bulkCreateShifts,
      copyWeek,
      publishWeek,
      refetchAll,
      copyPreviousWeek,
      clearCurrentWeek,
      publishWeekStatus,
    },
  };
}
