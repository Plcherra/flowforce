import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { canViewScheduleDrafts } from '@/utils/authRoles';
import { buildSchedulingFallbackData } from './fallbackData';
import type {
  AssignmentWithUser,
  SchedulingQueryParams,
  ShiftUpsertInput,
  ShiftWithAssignments,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventUpsertInput,
  VendorEventRow,
  ProfileSummary,
} from './types';
import type { Tables } from '@/integrations/supabase/public-types';

type AssignmentRow = Tables<'schedule_assignments'>;
type TimeOffRow = Tables<'time_off_requests'>;
type UnavailabilityRow = Tables<'user_unavailability'>;

interface SchedulingConsolidatedResult {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOffRequests: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventRow[];
  loading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
  assign: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  upsertShift: (payload: ShiftUpsertInput) => Promise<Tables<'schedules'> | null>;
  upsertVendorEvent: (payload: VendorEventUpsertInput) => Promise<VendorEventRow | null>;
  isUsingFallbackData: boolean;
}

const DEFAULT_ERROR = 'Unable to load the latest scheduling data.';

export function useSchedulingConsolidated(params: SchedulingQueryParams): SchedulingConsolidatedResult {
  const { companyId, start, end } = params;
  const { toast } = useToast();
  const { user } = useAuth();

  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffWithUser[]>([]);
  const [unavailability, setUnavailability] = useState<UnavailabilityWithUser[]>([]);
  const [vendorEvents, setVendorEvents] = useState<VendorEventRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
  const fallbackNoticeShownRef = useRef<boolean>(false);

  const range = useMemo(() => {
    const parseDate = (value?: Date | string | null) => {
      if (!value) return undefined;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date;
    };

    const startDate = parseDate(start);
    const endDate = parseDate(end);

    const toIsoDate = (date?: Date) => (date ? date.toISOString().split('T')[0] : undefined);

    return {
      start: startDate ? startDate.toISOString() : undefined,
      end: endDate ? endDate.toISOString() : undefined,
      startDateOnly: toIsoDate(startDate),
      endDateOnly: toIsoDate(endDate),
    };
  }, [start, end]);

  const ensureCompanyContext = useCallback(() => {
    if (!companyId) {
      throw new Error('A company context is required for scheduling operations.');
    }
  }, [companyId]);

  const refetchAll = useCallback(async () => {
    if (!companyId) {
      setShifts([]);
      setAssignments([]);
      setTimeOffRequests([]);
      setUnavailability([]);
      setVendorEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('company_id', companyId);

      if (profilesError) throw profilesError;

      const profileMap = new Map<string, ProfileSummary>();
      (profileRows ?? []).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });
      const memberIds = (profileRows ?? []).map((profile) => profile.id);

      let schedulesQuery = supabase
        .from('schedules')
        .select(
          [
            'id',
            'company_id',
            'title',
            'role',
            'start_time',
            'end_time',
            'location',
            'required_headcount',
            'break_minutes',
            'color',
            'timezone',
            'notes',
            'created_at',
            'created_by',
            'updated_at',
            'is_all_day',
            'is_published',
            'is_template',
            'position_id',
            'template_id',
            'status',
            'requirements',
            'hourly_rate',
            'user_id',
          ].join(','),
        )
        .eq('company_id', companyId)
        .order('start_time', { ascending: true });

      if (!canViewScheduleDrafts(user)) {
        schedulesQuery = schedulesQuery.eq('is_published', true);
      }

      if (range.start) {
        schedulesQuery = schedulesQuery.gte('start_time', range.start);
      }
      if (range.end) {
        schedulesQuery = schedulesQuery.lt('start_time', range.end);
      }

      let vendorEventsQuery = supabase
        .from('vendor_event')
        .select('id, company_id, location_id, vendor_type, event_date, start_time, end_time, shift_id, notes, created_at')
        .eq('company_id', companyId)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (range.startDateOnly) {
        vendorEventsQuery = vendorEventsQuery.gte('event_date', range.startDateOnly);
      }
      if (range.endDateOnly) {
        vendorEventsQuery = vendorEventsQuery.lte('event_date', range.endDateOnly);
      }

      const [schedulesResult, vendorEventsResult] = await Promise.allSettled([schedulesQuery, vendorEventsQuery]);

      if (schedulesResult.status === 'rejected') {
        throw schedulesResult.reason;
      }

      if (schedulesResult.value.error) {
        throw schedulesResult.value.error;
      }

      const scheduleRows = schedulesResult.value.data ?? [];
      let vendorEventsRows: VendorEventRow[] = [];

      if (vendorEventsResult.status === 'fulfilled') {
        if (vendorEventsResult.value.error) {
          console.warn('Failed to load vendor events', vendorEventsResult.value.error);
        } else {
          vendorEventsRows = vendorEventsResult.value.data ?? [];
        }
      } else {
        console.warn('Failed to load vendor events', vendorEventsResult.reason);
      }

      const assignmentsPromise =
        scheduleRows.length === 0
          ? Promise.resolve<{ data: AssignmentRow[] | null; error: null }>({ data: [], error: null })
          : supabase
              .from('schedule_assignments')
              .select('id, schedule_id, user_id, status, assigned_at, assigned_by, confirmed_at')
              .in(
                'schedule_id',
                scheduleRows.map((row) => row.id),
              );

      const timeOffPromise =
        memberIds.length === 0
          ? Promise.resolve<{ data: TimeOffRow[] | null; error: null }>({ data: [], error: null })
          : supabase
              .from('time_off_requests')
              .select(
                'id, user_id, start_date, end_date, type, status, reason, notes, approved_at, approved_by, created_at, updated_at',
              )
              .in('user_id', memberIds)
              .order('created_at', { ascending: false });

      const unavailabilityPromise =
        memberIds.length === 0
          ? Promise.resolve<{ data: UnavailabilityRow[] | null; error: null }>({ data: [], error: null })
          : supabase
              .from('user_unavailability')
              .select(
                'id, user_id, created_by, start_time, end_time, reason, is_recurring, recurring_pattern, created_at, updated_at',
              )
              .in('user_id', memberIds)
              .order('start_time', { ascending: true });

      const [assignmentsResponse, timeOffResponse, unavailabilityResponse] = await Promise.all([
        assignmentsPromise,
        timeOffPromise,
        unavailabilityPromise,
      ]);

      if (assignmentsResponse.error) throw assignmentsResponse.error;
      if (timeOffResponse.error) throw timeOffResponse.error;
      if (unavailabilityResponse.error) throw unavailabilityResponse.error;

      const assignmentRows = (assignmentsResponse.data ?? []).map<AssignmentWithUser>((assignment) => ({
        ...assignment,
        user: assignment.user_id ? profileMap.get(assignment.user_id) ?? null : null,
      }));

      const enrichedShifts: ShiftWithAssignments[] = scheduleRows.map((shift) => ({
        ...shift,
        assignments: assignmentRows.filter((assignment) => assignment.schedule_id === shift.id),
      }));

      const enrichedTimeOff: TimeOffWithUser[] = (timeOffResponse.data ?? []).map((request) => ({
        ...request,
        user: profileMap.get(request.user_id) ?? null,
      }));

      const enrichedUnavailability: UnavailabilityWithUser[] = (unavailabilityResponse.data ?? []).map((item) => ({
        ...item,
        user: profileMap.get(item.user_id) ?? null,
        createdBy: profileMap.get(item.created_by) ?? null,
      }));

      setShifts(enrichedShifts);
      setAssignments(assignmentRows);
      setTimeOffRequests(enrichedTimeOff);
      setUnavailability(enrichedUnavailability);
      setVendorEvents(vendorEventsRows);
      setIsUsingFallback(false);
      fallbackNoticeShownRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : DEFAULT_ERROR;
      console.error('Failed to load scheduling data, using fallback data.', err);
      setError(message);
      const fallback = buildSchedulingFallbackData({ start: range.start });
      setShifts(fallback.shifts);
      setAssignments(fallback.assignments);
      setTimeOffRequests(fallback.timeOff);
      setUnavailability(fallback.unavailability);
      setVendorEvents(fallback.vendorEvents);
      setIsUsingFallback(true);

      if (!fallbackNoticeShownRef.current) {
        const description =
          'Live scheduling data is unavailable. Showing demo data so you can continue exploring the schedule experience.';
        toast({
          title: 'Scheduling in preview mode',
          description,
        });
        fallbackNoticeShownRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, range.end, range.endDateOnly, range.start, range.startDateOnly, toast, user]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  const assign = useCallback(
    async (shiftId: string, userId: string, status: string = 'assigned') => {
      try {
        ensureCompanyContext();

        const { error: insertError } = await supabase.from('schedule_assignments').insert({
          schedule_id: shiftId,
          user_id: userId,
          status,
          assigned_by: user?.id ?? null,
        });

        if (insertError) throw insertError;
        await refetchAll();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to assign teammate to shift.';
        toast({
          title: 'Assignment error',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [ensureCompanyContext, refetchAll, toast, user?.id],
  );

  const unassign = useCallback(
    async (shiftId: string, userId: string) => {
      try {
        ensureCompanyContext();

        const { error: deleteError } = await supabase
          .from('schedule_assignments')
          .delete()
          .eq('schedule_id', shiftId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        await refetchAll();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to unassign teammate from shift.';
        toast({
          title: 'Unassignment error',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [ensureCompanyContext, refetchAll, toast],
  );

  const upsertShift = useCallback(
    async (payload: ShiftUpsertInput) => {
      try {
        ensureCompanyContext();

        if (payload.id) {
          const { id, ...updates } = payload;
          const { data, error: updateError } = await supabase
            .from('schedules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          if (updateError) throw updateError;
          await refetchAll();
          return data;
        }

        if (!payload.start_time || !payload.end_time || !payload.title) {
          throw new Error('Shift title, start_time, and end_time are required.');
        }

        const { data, error: insertError } = await supabase
          .from('schedules')
          .insert({
            ...payload,
            id: payload.id ?? undefined,
            company_id: companyId!,
            created_by: user?.id ?? null,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        await refetchAll();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to save shift.';
        toast({
          title: 'Shift save error',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [companyId, ensureCompanyContext, refetchAll, toast, user?.id],
  );

  const upsertVendorEvent = useCallback(
    async (payload: VendorEventUpsertInput) => {
      try {
        ensureCompanyContext();

        const baseEvent: Partial<VendorEventRow> = {
          ...payload,
          company_id: companyId!,
        };

        let response;
        if (payload.id) {
          const { id, ...updates } = baseEvent;
          response = await supabase.from('vendor_event').update(updates).eq('id', payload.id).select().single();
        } else {
          response = await supabase.from('vendor_event').insert(baseEvent).select().single();
        }

        if (response.error) throw response.error;
        await refetchAll();
        return response.data ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to save vendor event.';
        toast({
          title: 'Vendor event error',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [companyId, ensureCompanyContext, refetchAll, toast],
  );

  return {
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
    isUsingFallbackData: isUsingFallback,
  };
}

export type {
  ShiftWithAssignments,
  AssignmentWithUser,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventRow as VendorEventWithMetadata,
  ShiftUpsertInput,
  VendorEventUpsertInput,
  SchedulingQueryParams,
} from './types';
