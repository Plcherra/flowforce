import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { endOfWeek, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  useSchedulingConsolidated,
  type AssignmentWithUser,
  type ShiftUpsertInput,
  type ShiftWithAssignments,
  type TimeOffWithUser,
  type UnavailabilityWithUser,
  type VendorEventUpsertInput,
  type VendorEventWithMetadata,
} from '@/hooks/scheduling/useSchedulingConsolidated';
import { useShiftTemplates } from '@/hooks/scheduling/useShiftTemplates';
import { useWeekTemplates } from '@/hooks/scheduling/useWeekTemplates';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

interface SchedulingContextType {
  shifts: ShiftWithAssignments[];
  schedules: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOffRequests: TimeOffWithUser[];
  staffAvailability: UnavailabilityWithUser[];
  unavailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventWithMetadata[];
  shiftTemplates: Tables<'shift_templates'>[];
  weekTemplates: Tables<'week_templates'>[];
  loading: boolean;
  error: string | null;
  weekRange: { start: Date; end: Date };
  isEmptyShifts: boolean;
  isEmptyAssignments: boolean;
  isEmptyTimeOff: boolean;
  isEmptyUnavailability: boolean;
  isEmptyVendorEvents: boolean;
  isEmptyShiftTemplates: boolean;
  isEmptyWeekTemplates: boolean;
  refetchAll: () => Promise<void>;
  fetchSchedules: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  fetchTimeOffRequests: () => Promise<void>;
  fetchStaffAvailability: () => Promise<void>;
  fetchShiftTemplates: () => Promise<void>;
  fetchWeekTemplates: () => Promise<void>;
  createShift: (payload: Omit<TablesInsert<'schedules'>, 'company_id' | 'created_by'>) => Promise<Tables<'schedules'> | null>;
  createSchedule: (payload: Omit<TablesInsert<'schedules'>, 'company_id' | 'created_by'>) => Promise<Tables<'schedules'> | null>;
  updateShift: (id: string, updates: TablesUpdate<'schedules'>) => Promise<Tables<'schedules'> | null>;
  updateSchedule: (id: string, updates: TablesUpdate<'schedules'>) => Promise<Tables<'schedules'> | null>;
  deleteShift: (id: string) => Promise<boolean>;
  deleteSchedule: (id: string) => Promise<boolean>;
  assignUserToShift: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  unassignUserFromShift: (shiftId: string, userId: string) => Promise<boolean>;
  assign: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  createVendorEvent: (payload: VendorEventUpsertInput) => Promise<VendorEventWithMetadata | null>;
  upsertVendorEvent: (payload: VendorEventUpsertInput) => Promise<VendorEventWithMetadata | null>;
  approveTimeOff: (requestId: string, notes?: string) => Promise<boolean>;
  getSchedulesByDateRange: (startDate: Date, endDate: Date) => ShiftWithAssignments[];
  getSchedulesForDate: (date: Date) => ShiftWithAssignments[];
  getTotalHoursForPeriod: (startDate: Date, endDate: Date) => number;
}

const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

interface SchedulingProviderProps {
  children: React.ReactNode;
}

type ShiftInsertPayload = Omit<TablesInsert<'schedules'>, 'company_id' | 'created_by'>;
type ShiftUpdatePayload = TablesUpdate<'schedules'>;

export function SchedulingProvider({ children }: SchedulingProviderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const weekRange = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(start);
    return { start, end };
  }, []);

  const {
    shifts,
    assignments,
    timeOffRequests,
    unavailability,
    vendorEvents,
    loading: consolidatedLoading,
    error,
    refetchAll,
    assign,
    unassign,
    upsertShift,
    upsertVendorEvent,
  } = useSchedulingConsolidated({
    companyId,
    start: weekRange.start,
    end: weekRange.end,
  });

  const {
    templates: rawShiftTemplates,
    loading: shiftTemplatesLoading,
    refetchTemplates: refetchShiftTemplates,
  } = useShiftTemplates();

  const {
    templates: rawWeekTemplates,
    loading: weekTemplatesLoading,
    refetchTemplates: refetchWeekTemplates,
  } = useWeekTemplates();

  const shiftTemplates = useMemo(
    () =>
      companyId
        ? rawShiftTemplates.filter((template) => !template.company_id || template.company_id === companyId)
        : rawShiftTemplates,
    [companyId, rawShiftTemplates],
  );

  const weekTemplates = useMemo(
    () =>
      companyId
        ? rawWeekTemplates.filter((template) => !template.company_id || template.company_id === companyId)
        : rawWeekTemplates,
    [companyId, rawWeekTemplates],
  );

  const loading = consolidatedLoading || shiftTemplatesLoading || weekTemplatesLoading;

  type OptimisticDiff = {
    add: AssignmentWithUser[];
    remove: string[]; // user ids
  };

  const [optimisticAssignments, setOptimisticAssignments] = useState<Record<string, OptimisticDiff>>({});
  const optimisticRef = useRef(optimisticAssignments);

  useEffect(() => {
    optimisticRef.current = optimisticAssignments;
  }, [optimisticAssignments]);

  const isEmptyShifts = !consolidatedLoading && shifts.length === 0;
  const isEmptyAssignments = !consolidatedLoading && assignments.length === 0;
  const isEmptyTimeOff = !consolidatedLoading && timeOffRequests.length === 0;
  const isEmptyUnavailability = !consolidatedLoading && unavailability.length === 0;
  const isEmptyVendorEvents = !consolidatedLoading && vendorEvents.length === 0;
  const isEmptyShiftTemplates = !shiftTemplatesLoading && shiftTemplates.length === 0;
  const isEmptyWeekTemplates = !weekTemplatesLoading && weekTemplates.length === 0;

  const ensureCompanyContext = useCallback(() => {
    if (!companyId || !user?.id) {
      throw new Error('Company context is not available for scheduling operations.');
    }
  }, [companyId, user?.id]);

  const createShift = useCallback(
    async (payload: ShiftInsertPayload) => {
      ensureCompanyContext();
      const result = await upsertShift(payload as ShiftUpsertInput);
      if (result) {
        toast({
          title: 'Shift created',
          description: 'New shift added to the schedule.',
        });
      }
      return result;
    },
    [ensureCompanyContext, toast, upsertShift],
  );

  const updateShift = useCallback(
    async (id: string, updates: ShiftUpdatePayload) => {
      ensureCompanyContext();
      const result = await upsertShift({ id, ...updates } as ShiftUpsertInput);
      if (result) {
        toast({
          title: 'Shift updated',
          description: 'Shift details saved successfully.',
        });
      }
      return result;
    },
    [ensureCompanyContext, toast, upsertShift],
  );

  const deleteShift = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase.from('schedules').delete().eq('id', id);
        if (deleteError) throw deleteError;
        await refetchAll();
        toast({
          title: 'Shift removed',
          description: 'Shift deleted from the schedule.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete shift';
        toast({
          title: 'Shift deletion failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [refetchAll, toast],
  );

  const clearOptimisticEntry = useCallback((shiftId: string) => {
    setOptimisticAssignments((prev) => {
      const { [shiftId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const applyOptimistic = useCallback(
    (next: (current: Record<string, OptimisticDiff>) => Record<string, OptimisticDiff>) =>
      setOptimisticAssignments((prev) => next(prev)),
    [],
  );

  const assignUserToShift = useCallback(
    async (shiftId: string, userId: string, status: string = 'assigned') => {
      const optimisticAssignment: AssignmentWithUser = {
        id: `optimistic-${shiftId}-${userId}`,
        schedule_id: shiftId,
        user_id: userId,
        status,
        assigned_at: new Date().toISOString(),
        assigned_by: profile?.userId ?? null,
        confirmed_at: null,
        user: null,
      };

      const previous = optimisticRef.current[shiftId];

      applyOptimistic((prev) => {
        const current = prev[shiftId] ?? { add: [], remove: [] };
        const filteredAdd = current.add.filter((entry) => entry.user_id !== userId);
        const filteredRemove = current.remove.filter((id) => id !== userId);
        return {
          ...prev,
          [shiftId]: {
            add: [...filteredAdd, optimisticAssignment],
            remove: filteredRemove,
          },
        };
      });

      try {
        const success = await assign(shiftId, userId, status);
        if (!success) {
          throw new Error('Assignment failed');
        }
        await refetchAll();
        clearOptimisticEntry(shiftId);
        return true;
      } catch (err) {
        applyOptimistic((prev) => {
          if (!previous) {
            const { [shiftId]: _current, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [shiftId]: previous,
          };
        });
        toast({
          title: 'Assignment failed',
          description: err instanceof Error ? err.message : 'Unable to assign teammate to shift.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [applyOptimistic, assign, clearOptimisticEntry, profile?.userId, refetchAll, toast],
  );

  const unassignUserFromShift = useCallback(
    async (shiftId: string, userId: string) => {
      const previous = optimisticRef.current[shiftId];

      applyOptimistic((prev) => {
        const current = prev[shiftId] ?? { add: [], remove: [] };
        const filteredAdd = current.add.filter((entry) => entry.user_id !== userId);
        const removeSet = new Set(current.remove);
        removeSet.add(userId);
        return {
          ...prev,
          [shiftId]: {
            add: filteredAdd,
            remove: Array.from(removeSet),
          },
        };
      });

      try {
        const success = await unassign(shiftId, userId);
        if (!success) {
          throw new Error('Unassignment failed');
        }
        await refetchAll();
        clearOptimisticEntry(shiftId);
        return true;
      } catch (err) {
        applyOptimistic((prev) => {
          if (!previous) {
            const { [shiftId]: _current, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [shiftId]: previous,
          };
        });
        toast({
          title: 'Unassign failed',
          description: err instanceof Error ? err.message : 'Unable to unassign teammate from shift.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [applyOptimistic, clearOptimisticEntry, refetchAll, toast, unassign],
  );

  const createVendorEvent = useCallback(
    async (payload: VendorEventUpsertInput) => {
      ensureCompanyContext();
      const event = await upsertVendorEvent({ ...payload, company_id: companyId! });
      if (event) {
        toast({
          title: 'Vendor visit scheduled',
          description: 'Vendor event has been created.',
        });
      }
      return event;
    },
    [companyId, ensureCompanyContext, toast, upsertVendorEvent],
  );

  const approveTimeOff = useCallback(
    async (requestId: string, notes?: string) => {
      try {
        const { error: updateError } = await supabase
          .from('time_off_requests')
          .update({
            status: 'approved',
            approved_by: user?.id ?? null,
            approved_at: new Date().toISOString(),
            notes: notes ?? undefined,
          })
          .eq('id', requestId);

        if (updateError) throw updateError;

        await refetchAll();
        toast({
          title: 'Time off approved',
          description: 'The time off request has been approved.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve time off request';
        toast({
          title: 'Approval failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [refetchAll, toast, user?.id],
  );

  const fetchSchedules = useCallback(async () => {
    await refetchAll();
  }, [refetchAll]);

  const fetchAssignments = fetchSchedules;
  const fetchTimeOff = fetchSchedules;
  const fetchAvailability = fetchSchedules;

  const fetchShiftTemplates = useCallback(async () => {
    await refetchShiftTemplates();
  }, [refetchShiftTemplates]);

  const fetchWeekTemplates = useCallback(async () => {
    await refetchWeekTemplates();
  }, [refetchWeekTemplates]);

  const getSchedulesByDateRange = useCallback(
    (startDate: Date, endDate: Date) => {
      const startDateValue = new Date(startDate);
      const endDateValue = new Date(endDate);
      return shifts.filter((shift) => {
        const shiftDate = new Date(shift.start_time);
        return shiftDate >= startDateValue && shiftDate <= endDateValue;
      });
    },
    [shifts],
  );

  const getSchedulesForDate = useCallback(
    (date: Date) => {
      const startDateValue = new Date(date);
      startDateValue.setHours(0, 0, 0, 0);
      const endDateValue = new Date(date);
      endDateValue.setHours(23, 59, 59, 999);
      return getSchedulesByDateRange(startDateValue, endDateValue);
    },
    [getSchedulesByDateRange],
  );

  const getTotalHoursForPeriod = useCallback(
    (startDate: Date, endDate: Date) => {
      const relevantShifts = getSchedulesByDateRange(startDate, endDate);
      return relevantShifts.reduce((total, shift) => {
        const startValue = new Date(shift.start_time);
        const endValue = new Date(shift.end_time);
        const hours = (endValue.getTime() - startValue.getTime()) / (1000 * 60 * 60);
        return total + Math.max(hours, 0);
      }, 0);
    },
    [getSchedulesByDateRange],
  );

  const effectiveShifts = useMemo(() => {
    if (!Object.keys(optimisticAssignments).length) return shifts;
    return shifts.map((shift) => {
      const diff = optimisticAssignments[shift.id];
      if (!diff) return shift;
      const removeSet = new Set(diff.remove);
      let updated = shift.assignments.filter((assignment) => !removeSet.has(assignment.user_id ?? ''));
      diff.add.forEach((assignment) => {
        if (!updated.some((existing) => existing.user_id === assignment.user_id)) {
          updated = [...updated, assignment];
        }
      });
      return { ...shift, assignments: updated };
    });
  }, [optimisticAssignments, shifts]);

  const effectiveAssignments = useMemo(() => {
    if (!Object.keys(optimisticAssignments).length) return assignments;
    const removalsByShift = new Map<string, Set<string>>();
    const additions: AssignmentWithUser[] = [];

    Object.entries(optimisticAssignments).forEach(([shiftId, diff]) => {
      if (diff.remove.length > 0) {
        removalsByShift.set(shiftId, new Set(diff.remove));
      }
      additions.push(...diff.add);
    });

    const filtered = assignments.filter((assignment) => {
      const shiftId = assignment.schedule_id ?? '';
      const userId = assignment.user_id ?? '';
      const removeSet = removalsByShift.get(shiftId);
      if (removeSet?.has(userId)) return false;
      return true;
    });

    return [...filtered, ...additions];
  }, [assignments, optimisticAssignments]);

  const contextValue: SchedulingContextType = {
    shifts: effectiveShifts,
    schedules: effectiveShifts,
    assignments: effectiveAssignments,
    timeOffRequests,
    staffAvailability: unavailability,
    unavailability,
    vendorEvents,
    shiftTemplates,
    weekTemplates,
    loading,
    error,
    weekRange,
    isEmptyShifts,
    isEmptyAssignments,
    isEmptyTimeOff,
    isEmptyUnavailability,
    isEmptyVendorEvents,
    isEmptyShiftTemplates,
    isEmptyWeekTemplates,
    refetchAll,
    fetchSchedules,
    fetchAssignments,
    fetchTimeOffRequests: fetchTimeOff,
    fetchStaffAvailability: fetchAvailability,
    fetchShiftTemplates,
    fetchWeekTemplates,
    createShift,
    createSchedule: createShift,
    updateShift,
    updateSchedule: updateShift,
    deleteShift,
    deleteSchedule: deleteShift,
    assignUserToShift,
    unassignUserFromShift,
    assign: assignUserToShift,
    unassign: unassignUserFromShift,
    createVendorEvent,
    upsertVendorEvent,
    approveTimeOff,
    getSchedulesByDateRange,
    getSchedulesForDate,
    getTotalHoursForPeriod,
  };

  return <SchedulingContext.Provider value={contextValue}>{children}</SchedulingContext.Provider>;
}

export const useScheduling = () => {
  const context = useContext(SchedulingContext);
  if (context === undefined) {
    throw new Error('useScheduling must be used within a SchedulingProvider');
  }
  return context;
};
