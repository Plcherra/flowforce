import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useScheduling } from '@/contexts/SchedulingContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useProfile } from '@/hooks/useProfile';
import type { ShiftWithAssignments } from '@/hooks/scheduling/useSchedulingConsolidated';
import type { VendorEventWithMetadata } from './useSchedulingConsolidated';

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

export function useScheduleBoard({ selectedDate, locationFilter, pendingVendorEvent }: UseScheduleBoardParams) {
  const {
    shifts,
    assignments,
    timeOff: timeOffRequests,
    unavailability,
    vendorEvents,
    loading,
    refetchAll,
    mutations,
  } = useScheduling();
  const {
    createSchedule,
    updateSchedule,
    assign,
    unassign,
    createVendorEvent,
    autoGenerateWeek,
    clearWeek,
    addUnavailability,
    requestTimeOff,
    bulkCreateShifts,
    copyWeek,
    publishWeek,
    generateRecommendations,
  } = mutations;
  const { employees } = useEmployees();
  const { profile } = useProfile();

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const formattedWeekStart = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart]);
  const formattedWeekEnd = useMemo(() => format(weekEnd, 'yyyy-MM-dd'), [weekEnd]);
  const previousWeekStart = useMemo(() => addDays(weekStart, -7), [weekStart]);
  const formattedPreviousWeekStart = useMemo(
    () => format(previousWeekStart, 'yyyy-MM-dd'),
    [previousWeekStart],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const hours = useMemo(() => Array.from({ length: 17 }, (_, index) => index + 6), []);

  const fetchLocations = useCallback(async () => {
    if (!companyId) {
      setLocations([]);
      return;
    }

    setIsLocationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inv_locations')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to load locations', error);
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
        return (schedule.location ?? '') === locationFilter;
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
        return isSameDay(start, day) && (schedule.assignments?.length ?? 0) === 0;
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
      ['Title', 'Location', 'Start', 'End', 'Published', 'Required', 'Assigned'],
      ...weekSchedules.map((schedule) => [
        schedule.title ?? '',
        schedule.location ?? '',
        format(new Date(schedule.start_time), 'yyyy-MM-dd HH:mm'),
        format(new Date(schedule.end_time), 'yyyy-MM-dd HH:mm'),
        schedule.is_published ? 'Yes' : 'No',
        schedule.required_headcount ?? 1,
        schedule.assignments?.length ?? 0,
      ]),
    ];
  }, [weekSchedules]);

  const weekCsvContent = useMemo(
    () =>
      weekCsvRows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n'),
    [weekCsvRows],
  );

  const weekCsvFilename = useMemo(
    () => `schedule-week-${formattedWeekStart}.csv`,
    [formattedWeekStart],
  );

  const autoFillWeek = useCallback(async () => {
    await autoGenerateWeek({
      weekStart: formattedWeekStart,
      preferences: { balance: true, fairness: true },
    });
  }, [autoGenerateWeek, formattedWeekStart]);

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

  const disabledDates = useMemo(() => {
    const map = new Map<string, Set<string>>();

    weekDays.forEach((day) => {
      const iso = day.toISOString().slice(0, 10);

      timeOffRequests.forEach((request) => {
        if (!request.user_id) return;
        const startSource = request.start_date ?? request.start_time ?? request.created_at;
        const endSource = request.end_date ?? request.end_time ?? request.start_date ?? request.created_at;
        if (!startSource || !endSource) return;
        const start = new Date(startSource);
        const end = new Date(endSource);
        const within = day >= start && day <= end;
        if (within) {
          const set = map.get(request.user_id) ?? new Set<string>();
          set.add(iso);
          map.set(request.user_id, set);
        }
      });

      unavailability.forEach((entry) => {
        if (!entry.user_id) return;
        const start = entry.start_time ? new Date(entry.start_time) : null;
        const end = entry.end_time ? new Date(entry.end_time) : null;
        if (!start || !end) return;
        const within = day >= start && day <= end;
        if (within) {
          const set = map.get(entry.user_id) ?? new Set<string>();
          set.add(iso);
          map.set(entry.user_id, set);
        }
      });
    });

    return map;
  }, [timeOffRequests, unavailability, weekDays]);

  const candidateVendorShifts = useMemo<ShiftWithAssignments[]>(() => {
    if (!pendingVendorEvent) return [];

    const priorityRoles = ['supervisor', 'manager'];

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
        const roleA = a.role?.toLowerCase?.() ?? '';
        const roleB = b.role?.toLowerCase?.() ?? '';
        const priorityA = priorityRoles.indexOf(roleA);
        const priorityB = priorityRoles.indexOf(roleB);

        if (priorityA === priorityB) {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
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
    disabledDates,
    loading,
    actions: {
      createSchedule,
      updateSchedule,
      assign,
      unassign,
      createVendorEvent,
      autoGenerateWeek,
      clearWeek,
      addUnavailability,
      requestTimeOff,
      bulkCreateShifts,
      copyWeek,
      publishWeek,
      generateRecommendations,
      refetchAll,
      autoFillWeek,
      copyPreviousWeek,
      clearCurrentWeek,
      publishWeekStatus,
    },
  };
}
