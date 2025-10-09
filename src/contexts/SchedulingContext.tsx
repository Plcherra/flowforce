import { createContext, useCallback, useContext, useMemo } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type ShiftInsertPayload = Omit<TablesInsert<'schedules'>, 'company_id' | 'created_by'>;

type SchedulingMutations = {
  createSchedule: (payload: ShiftInsertPayload) => Promise<Tables<'schedules'> | null>;
  updateSchedule: (id: string, updates: TablesUpdate<'schedules'>) => Promise<Tables<'schedules'> | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  assign: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  createVendorEvent: (payload: VendorEventUpsertInput) => Promise<VendorEventWithMetadata | null>;
  deleteVendorEvent: (id: string) => Promise<boolean>;
  autoGenerateWeek: (params: { weekStart: string; preferences?: Record<string, unknown> }) => Promise<boolean>;
  clearWeek: (params: { weekStart: string; weekEnd: string }) => Promise<boolean>;
  addUnavailability: (payload: { userId: string; start: string; end: string; reason?: string | null }) => Promise<boolean>;
  requestTimeOff: (payload: {
    userId: string;
    startDate: string;
    endDate: string;
    type: 'vacation' | 'sick' | 'personal' | 'other';
    reason?: string | null;
  }) => Promise<boolean>;
  bulkCreateShifts: (payloads: ShiftInsertPayload[]) => Promise<boolean>;
  copyWeek: (params: { sourceWeekStart: string; targetWeekStart: string }) => Promise<boolean>;
  publishWeek: (params: { weekStart: string; weekEnd: string; isPublished: boolean }) => Promise<boolean>;
  generateRecommendations: (scheduleId: string) => Promise<AIRecommendation[]>;
  approveTimeOff: (requestId: string, notes?: string) => Promise<boolean>;
  upsertVendorEvent: (payload: VendorEventUpsertInput) => Promise<VendorEventWithMetadata | null>;
};

interface SchedulingContextType {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventWithMetadata[];
  loading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
  weekRange: { start: Date; end: Date };
  mutations: SchedulingMutations;
}

type AIRecommendation = {
  name: string;
  score: number;
  reasons?: string[];
};

const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

interface SchedulingProviderProps {
  children: React.ReactNode;
}

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
    loading,
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

  const ensureCompanyContext = useCallback(() => {
    if (!companyId) {
      throw new Error('Company context is not available for scheduling operations.');
    }
  }, [companyId]);

  const createSchedule = useCallback(
    async (payload: ShiftInsertPayload) => {
      try {
        const result = await upsertShift(payload as ShiftUpsertInput);
        if (result) {
          toast({
            title: 'Shift created',
            description: 'New shift added to the schedule.',
          });
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create shift';
        toast({
          title: 'Shift creation failed',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast, upsertShift],
  );

  const updateSchedule = useCallback(
    async (id: string, updates: TablesUpdate<'schedules'>) => {
      try {
        const result = await upsertShift({ id, ...updates } as ShiftUpsertInput);
        if (result) {
          toast({
            title: 'Shift updated',
            description: 'Shift details saved successfully.',
          });
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update shift';
        toast({
          title: 'Shift update failed',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast, upsertShift],
  );

  const deleteSchedule = useCallback(
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

  const createVendorEvent = useCallback(
    async (payload: VendorEventUpsertInput) => {
      try {
        ensureCompanyContext();
        const event = await upsertVendorEvent({ ...payload, company_id: companyId! });
        if (event) {
          toast({
            title: 'Vendor visit scheduled',
            description: 'Vendor event has been created.',
          });
        }
        return event;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to schedule vendor event';
        toast({
          title: 'Vendor scheduling failed',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [companyId, ensureCompanyContext, toast, upsertVendorEvent],
  );

  const deleteVendorEvent = useCallback(
    async (id: string) => {
      try {
        ensureCompanyContext();
        const { error: deleteError } = await supabase.from('vendor_event').delete().eq('id', id);
        if (deleteError) throw deleteError;
        await refetchAll();
        toast({
          title: 'Vendor visit removed',
          description: 'Vendor event has been deleted.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete vendor event';
        toast({
          title: 'Vendor removal failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [ensureCompanyContext, refetchAll, toast],
  );

  const autoGenerateWeek = useCallback(
    async (params: { weekStart: string; preferences?: Record<string, unknown> }) => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('ai-scheduling-assistant', {
          body: {
            action: 'auto_schedule',
            data: {
              companyId: companyId ?? 'current',
              weekStart: params.weekStart,
              preferences: params.preferences ?? { balance: true, fairness: true },
            },
          },
        });

        if (fnError) throw fnError;

        await refetchAll();
        toast({
          title: 'AI schedule generated',
          description: data?.schedule?.shifts?.length
            ? `${data.schedule.shifts.length} shifts created`
            : 'Schedule optimization completed.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate schedule';
        toast({
          title: 'Auto-scheduling failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [companyId, refetchAll, toast],
  );

  const bulkCreateShifts = useCallback(
    async (payloads: ShiftInsertPayload[]) => {
      if (!payloads.length) return true;

      try {
        await Promise.all(payloads.map((payload) => upsertShift(payload as ShiftUpsertInput)));
        toast({
          title: 'Shifts created',
          description: `${payloads.length} shift${payloads.length === 1 ? '' : 's'} added to the schedule.`,
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create shifts';
        toast({
          title: 'Shift creation failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast, upsertShift],
  );

  const copyWeek = useCallback(
    async (params: { sourceWeekStart: string; targetWeekStart: string }) => {
      try {
        ensureCompanyContext();
        const sourceStart = new Date(params.sourceWeekStart);
        const sourceEnd = new Date(sourceStart);
        sourceEnd.setDate(sourceEnd.getDate() + 7);
        const targetStart = new Date(params.targetWeekStart);
        const offset = targetStart.getTime() - sourceStart.getTime();

        const { data, error: queryError } = await supabase
          .from('schedules')
          .select('*')
          .eq('company_id', companyId)
          .gte('start_time', sourceStart.toISOString())
          .lt('start_time', sourceEnd.toISOString());

        if (queryError) throw queryError;

        const payloads =
          data
            ?.filter((row) => row.start_time && row.end_time)
            .map<ShiftInsertPayload>((row) => {
              const start = new Date(row.start_time!);
              const end = new Date(row.end_time!);
              const nextStart = new Date(start.getTime() + offset);
              const nextEnd = new Date(end.getTime() + offset);
              return {
                title: row.title ?? 'Shift',
                role: row.role,
                color: row.color ?? '#3b82f6',
                start_time: nextStart.toISOString(),
                end_time: nextEnd.toISOString(),
                location: row.location ?? '',
                is_all_day: row.is_all_day ?? false,
                timezone: row.timezone ?? 'UTC',
                required_headcount: row.required_headcount ?? 1,
                notes: row.notes ?? null,
                break_minutes: row.break_minutes ?? 0,
                hourly_rate: row.hourly_rate ?? null,
                is_published: false,
                is_template: false,
                template_id: null,
                position_id: row.position_id ?? null,
                status: row.status ?? 'scheduled',
                user_id: null,
                requirements: row.requirements ?? [],
              };
            }) ?? [];

        await bulkCreateShifts(payloads);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to copy week';
        toast({
          title: 'Copy failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [bulkCreateShifts, companyId, ensureCompanyContext, toast],
  );

  const clearWeek = useCallback(
    async (params: { weekStart: string; weekEnd: string }) => {
      try {
        const { error: schedulesError } = await supabase
          .from('schedules')
          .delete()
          .gte('start_time', params.weekStart)
          .lt('start_time', params.weekEnd);
        if (schedulesError) throw schedulesError;

        const { error: vendorsError } = await supabase
          .from('vendor_event')
          .delete()
          .gte('event_date', params.weekStart)
          .lt('event_date', params.weekEnd);
        if (vendorsError) throw vendorsError;

        await refetchAll();
        toast({
          title: 'Week cleared',
          description: 'Shifts and vendor events removed.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to clear week';
        toast({
          title: 'Clear failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [refetchAll, toast],
  );

  const publishWeek = useCallback(
    async (params: { weekStart: string; weekEnd: string; isPublished: boolean }) => {
      try {
        ensureCompanyContext();
        const { error: updateError } = await supabase
          .from('schedules')
          .update({ is_published: params.isPublished })
          .eq('company_id', companyId)
          .gte('start_time', params.weekStart)
          .lt('start_time', params.weekEnd);
        if (updateError) throw updateError;
        await refetchAll();
        toast({
          title: params.isPublished ? 'Week published' : 'Week unpublished',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update publication status';
        toast({
          title: 'Action failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [companyId, ensureCompanyContext, refetchAll, toast],
  );

  const addUnavailability = useCallback(
    async (payload: { userId: string; start: string; end: string; reason?: string | null }) => {
      try {
        const { error: insertError } = await supabase.from('user_unavailability').insert({
          user_id: payload.userId,
          start_time: payload.start,
          end_time: payload.end,
          reason: payload.reason ?? null,
        });
        if (insertError) throw insertError;
        await refetchAll();
        toast({
          title: 'Unavailability added',
          description: 'The unavailability has been recorded.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add unavailability';
        toast({
          title: 'Unavailability error',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [refetchAll, toast],
  );

  const requestTimeOff = useCallback(
    async (payload: {
      userId: string;
      startDate: string;
      endDate: string;
      type: 'vacation' | 'sick' | 'personal' | 'other';
      reason?: string | null;
    }) => {
      try {
        const { error: insertError } = await supabase.from('time_off_requests').insert({
          user_id: payload.userId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          type: payload.type,
          reason: payload.reason ?? 'time off',
          status: 'pending',
          notes: null,
          approved_by: null,
          approved_at: null,
        });
        if (insertError) throw insertError;
        await refetchAll();
        toast({
          title: 'Time off requested',
          description: 'Time off request submitted.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request time off';
        toast({
          title: 'Request failed',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [refetchAll, toast],
  );

  const generateRecommendations = useCallback(
    async (scheduleId: string) => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('ai-scheduling-assistant', {
          body: {
            action: 'generate_recommendations',
            data: {
              scheduleId,
              companyId: companyId ?? 'current',
            },
          },
        });

        if (fnError) throw fnError;

        const recommendations = Array.isArray(data?.recommendations)
          ? (data.recommendations as AIRecommendation[])
          : [];
        return recommendations;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to fetch recommendations';
        toast({
          title: 'AI recommendations unavailable',
          description: message,
          variant: 'destructive',
        });
        return [];
      }
    },
    [companyId, toast],
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

  const mutations = useMemo<SchedulingMutations>(
    () => ({
      createSchedule,
      updateSchedule,
      deleteSchedule,
      assign,
      unassign,
      createVendorEvent,
      deleteVendorEvent,
      autoGenerateWeek,
      clearWeek,
      addUnavailability,
      requestTimeOff,
      bulkCreateShifts,
      copyWeek,
      publishWeek,
      generateRecommendations,
      approveTimeOff,
      upsertVendorEvent,
    }),
    [
      addUnavailability,
      approveTimeOff,
      assign,
      autoGenerateWeek,
      bulkCreateShifts,
      clearWeek,
      copyWeek,
      createSchedule,
      createVendorEvent,
      deleteSchedule,
      deleteVendorEvent,
      generateRecommendations,
      publishWeek,
      requestTimeOff,
      unassign,
      updateSchedule,
      upsertVendorEvent,
    ],
  );

  const value: SchedulingContextType = {
    shifts,
    assignments,
    timeOff: timeOffRequests,
    unavailability,
    vendorEvents,
    loading,
    error,
    refetchAll,
    weekRange,
    mutations,
  };

  return <SchedulingContext.Provider value={value}>{children}</SchedulingContext.Provider>;
}

export const useScheduling = () => {
  const context = useContext(SchedulingContext);
  if (!context) {
    throw new Error('useScheduling must be used within a SchedulingProvider');
  }
  return context;
};
