import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { computeAutoLockThreshold } from '@/availability/lockEngine';
import {
  cloneGrid,
  computeImpactScore,
  gridFromAvailabilityRows,
  rangesFromGrid,
  type StaffAvailabilityRow,
} from '@/availability/availabilityUtils';
import { supabase } from '@/integrations/supabase/client';
import { notifyEmployeeDecision } from '@/notifications/availability';
import { queryKeys } from '@/lib/queryKeys';
import type {
  AvailabilityException,
  AvailabilityLockMode,
  OrgPrefs,
} from '@/types/availability';
import type { AvailabilityGrid } from '@/components/availability/AvailabilityRequestForm';

import type {
  AvailabilityEmployee,
  DayOption,
  ExceptionFormState,
  HourOption,
  LockStatePreview,
  ManagerAvailabilityRequest,
} from './types';

const DAY_OPTIONS: DayOption[] = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const HOUR_OPTIONS: HourOption[] = Array.from({ length: 24 }).map((_, index) => ({
  value: index.toString(),
  label: dayjs().hour(index).minute(0).format('h A'),
}));

type ToastFn = (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;

async function invalidateAvailabilityQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | null | undefined,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.orgPrefs(orgId) }),
    queryClient.invalidateQueries({ queryKey: ['availability-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['availability-exceptions', orgId ?? null] }),
  ]);
}

function createInitialExceptionForm(): ExceptionFormState {
  return {
    employeeId: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    reason: '',
  };
}

interface UseAvailabilityManagementOptions {
  orgId: string | null | undefined;
  queriesEnabled: boolean;
  toast: ToastFn;
  userId: string | null | undefined;
  refetchAll: () => Promise<unknown>;
}

export function useAvailabilityManagement({
  orgId,
  queriesEnabled,
  toast,
  userId,
  refetchAll,
}: UseAvailabilityManagementOptions) {
  const queryClient = useQueryClient();
  const [pendingMode, setPendingMode] = useState<AvailabilityLockMode>('open');
  const [pendingDay, setPendingDay] = useState('4');
  const [pendingHour, setPendingHour] = useState('17');
  const [exceptionForm, setExceptionForm] = useState<ExceptionFormState>(createInitialExceptionForm());

  const employeesQuery = useQuery({
    queryKey: ['availability-employees', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AvailabilityEmployee[];
    },
    enabled: queriesEnabled,
  });

  const orgPrefsQuery = useQuery({
    queryKey: queryKeys.orgPrefs(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_prefs')
        .select('id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour')
        .eq('id', orgId)
        .maybeSingle();
      if (error) throw error;

      const prefs: OrgPrefs = data
        ? {
            id: data.id,
            availabilityLockMode: data.availability_lock_mode as AvailabilityLockMode,
            autoLockDayOfWeek: data.auto_lock_day_of_week ?? 4,
            autoLockHour: data.auto_lock_hour ?? 17,
            createdAt: '',
            updatedAt: '',
          }
        : {
            id: orgId ?? '',
            availabilityLockMode: 'open',
            autoLockDayOfWeek: 4,
            autoLockHour: 17,
            createdAt: '',
            updatedAt: '',
          };

      return prefs;
    },
    enabled: queriesEnabled,
  });

  const requestsQuery = useQuery({
    queryKey: ['availability-requests'],
    queryFn: async (): Promise<ManagerAvailabilityRequest[]> => {
      const { data: requests, error } = await supabase
        .from('availability_request')
        .select('id, employee_id, week_start, payload, status, manager_id, decision_note, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      const employeeIds = Array.from(new Set(requests.map((req) => req.employee_id))).filter(Boolean);
      const weekStarts = Array.from(new Set(requests.map((req) => req.week_start))).filter(Boolean);

      const { data: employees } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', employeeIds);
      const employeeMap = new Map(
        (employees ?? []).map((profile) => [
          profile.id,
          `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown',
        ]),
      );

      let availRows: StaffAvailabilityRow[] = [];
      if (employeeIds.length > 0 && weekStarts.length > 0) {
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('staff_availability')
          .select('id, user_id, day_of_week, start_time, end_time, week_start_date')
          .in('user_id', employeeIds)
          .in('week_start_date', weekStarts);

        if (availabilityError) throw availabilityError;
        availRows = (availabilityData ?? []) as StaffAvailabilityRow[];
      }

      const availabilityMap = new Map<string, StaffAvailabilityRow[]>();
      availRows.forEach((row) => {
        const key = `${row.user_id}-${row.week_start_date}`;
        const list = availabilityMap.get(key) ?? [];
        list.push(row as StaffAvailabilityRow);
        availabilityMap.set(key, list);
      });

      return requests.map((request) => {
        const payload = (request.payload ?? {}) as {
          desiredAvailability?: AvailabilityGrid;
          requestedRange?: { start: string; end: string };
          reason?: string;
        };
        const desiredGrid = cloneGrid(payload.desiredAvailability ?? {});
        const requestedRange = payload.requestedRange ?? {
          start: request.week_start,
          end: dayjs(request.week_start).add(6, 'day').format('YYYY-MM-DD'),
        };
        const reason = payload.reason ?? '';
        const baselineRows = availabilityMap.get(`${request.employee_id}-${request.week_start}`) ?? [];
        const originalGrid = gridFromAvailabilityRows(baselineRows);
        const impactScore = computeImpactScore(originalGrid, desiredGrid);
        return {
          id: request.id,
          employeeId: request.employee_id,
          employeeName: employeeMap.get(request.employee_id) ?? 'Unknown',
          weekStart: request.week_start,
          status: request.status as ManagerAvailabilityRequest['status'],
          managerId: request.manager_id,
          decisionNote: request.decision_note,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
          payload: request.payload,
          desiredAvailability: desiredGrid,
          originalAvailability: originalGrid,
          requestedRange,
          reason,
          impactScore,
        };
      });
    },
    enabled: queriesEnabled,
  });

  const exceptionsQuery = useQuery({
    queryKey: ['availability-exceptions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_exception')
        .select('id, employee_id, start_date, end_date, reason, approved_by, created_at, updated_at')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AvailabilityException[];
    },
    enabled: queriesEnabled,
  });

  useEffect(() => {
    if (!orgPrefsQuery.data) return;
    setPendingMode(orgPrefsQuery.data.availabilityLockMode);
    setPendingDay(String(orgPrefsQuery.data.autoLockDayOfWeek));
    setPendingHour(String(orgPrefsQuery.data.autoLockHour));
  }, [orgPrefsQuery.data]);

  const lockStatePreview: LockStatePreview | null = useMemo(() => {
    if (!orgPrefsQuery.data) return null;
    const prefs = orgPrefsQuery.data;
    const weekStart = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
    const nextLock =
      pendingMode === 'auto'
        ? computeAutoLockThreshold(weekStart, {
            id: prefs.id,
            availability_lock_mode: 'auto',
            auto_lock_day_of_week: Number(pendingDay),
            auto_lock_hour: Number(pendingHour),
          })
        : null;
    return {
      nextLock,
    };
  }, [orgPrefsQuery.data, pendingMode, pendingDay, pendingHour]);

  const updatePrefsMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        id: orgId,
        availability_lock_mode: pendingMode,
        auto_lock_day_of_week: Number(pendingDay),
        auto_lock_hour: Number(pendingHour),
      };
      const { error } = await supabase.from('org_prefs').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: 'Lock settings updated',
        description: 'New availability lock configuration saved.',
      });
      await invalidateAvailabilityQueries(queryClient, orgId);
      await refetchAll();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Unable to save lock settings',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (request: ManagerAvailabilityRequest) => {
      if (!userId) throw new Error('Must be signed in to approve requests.');
      const ranges = rangesFromGrid(request.desiredAvailability);

      const deleteResult = await supabase
        .from('staff_availability')
        .delete()
        .eq('user_id', request.employeeId)
        .eq('week_start_date', request.weekStart);
      if (deleteResult.error) throw deleteResult.error;

      if (ranges.length > 0) {
        const insertRows = ranges.map((range) => ({
          user_id: request.employeeId,
          day_of_week: range.dayOfWeek,
          start_time: range.startTime,
          end_time: range.endTime,
          week_start_date: request.weekStart,
          is_preferred: true,
        }));
        const insertResult = await supabase.from('staff_availability').insert(insertRows);
        if (insertResult.error) throw insertResult.error;
      }

      const { start, end } = request.requestedRange;
      const exceptionInsert = await supabase.from('availability_exception').insert({
        employee_id: request.employeeId,
        start_date: start,
        end_date: end,
        reason: request.reason || 'Manager approved availability change',
        approved_by: userId,
      });
      if (exceptionInsert.error) throw exceptionInsert.error;

      const updateResult = await supabase
        .from('availability_request')
        .update({
          status: 'approved',
          manager_id: userId,
          decision_note: null,
        })
        .eq('id', request.id);
      if (updateResult.error) throw updateResult.error;

      const auditResult = await supabase.from('audit_log').insert({
        actor_id: userId,
        action: 'availability.request.approved',
        entity: 'availability_request',
        entity_id: request.id,
        meta: {
          employeeId: request.employeeId,
          weekStart: request.weekStart,
          requestedRange: request.requestedRange,
        },
      });
      if (auditResult.error) throw auditResult.error;

      await notifyEmployeeDecision(request.id);
    },
    onSuccess: async () => {
      toast({
        title: 'Request approved',
        description: 'Employee availability updated.',
      });
      await invalidateAvailabilityQueries(queryClient, orgId);
      await refetchAll();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Unable to approve request',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const denyRequestMutation = useMutation({
    mutationFn: async ({
      request,
      note,
    }: {
      request: ManagerAvailabilityRequest;
      note: string;
    }) => {
      if (!userId) throw new Error('Must be signed in to deny requests.');
      const updateResult = await supabase
        .from('availability_request')
        .update({
          status: 'denied',
          manager_id: userId,
          decision_note: note,
        })
        .eq('id', request.id);
      if (updateResult.error) throw updateResult.error;

      const auditResult = await supabase.from('audit_log').insert({
        actor_id: userId,
        action: 'availability.request.denied',
        entity: 'availability_request',
        entity_id: request.id,
        meta: {
          employeeId: request.employeeId,
          note,
        },
      });
      if (auditResult.error) throw auditResult.error;

      await notifyEmployeeDecision(request.id);
    },
    onSuccess: async () => {
      toast({
        title: 'Request denied',
        description: 'The employee has been notified.',
      });
      await invalidateAvailabilityQueries(queryClient, orgId);
      await refetchAll();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Unable to deny request',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const createExceptionMutation = useMutation({
    mutationFn: async () => {
      if (!exceptionForm.employeeId) throw new Error('Select an employee');
      const insertResult = await supabase.from('availability_exception').insert({
        employee_id: exceptionForm.employeeId,
        start_date: exceptionForm.startDate,
        end_date: exceptionForm.endDate,
        reason: exceptionForm.reason || null,
        approved_by: userId ?? null,
      });
      if (insertResult.error) throw insertResult.error;

      if (userId) {
        const auditResult = await supabase.from('audit_log').insert({
          actor_id: userId,
          action: 'availability.exception.created',
          entity: 'availability_exception',
          entity_id: exceptionForm.employeeId,
          meta: {
            start: exceptionForm.startDate,
            end: exceptionForm.endDate,
          },
        });
        if (auditResult.error) throw auditResult.error;
      }
    },
    onSuccess: async () => {
      toast({
        title: 'Exception saved',
        description: 'The employee can edit availability during this period.',
      });
      setExceptionForm(createInitialExceptionForm());
      await invalidateAvailabilityQueries(queryClient, orgId);
      await refetchAll();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Unable to save exception',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  return {
    dayOptions: DAY_OPTIONS,
    hourOptions: HOUR_OPTIONS,
    pendingMode,
    setPendingMode,
    pendingDay,
    setPendingDay,
    pendingHour,
    setPendingHour,
    exceptionForm,
    setExceptionForm,
    employeesQuery,
    orgPrefsQuery,
    requestsQuery,
    exceptionsQuery,
    lockStatePreview,
    updateLockSettings: () => updatePrefsMutation.mutate(),
    updateLockSettingsPending: updatePrefsMutation.isLoading,
    approveRequest: (request: ManagerAvailabilityRequest) => approveRequestMutation.mutate(request),
    denyRequest: (request: ManagerAvailabilityRequest, note: string) =>
      denyRequestMutation.mutate({ request, note }),
    requestsMutationPending: approveRequestMutation.isLoading || denyRequestMutation.isLoading,
    saveException: () => createExceptionMutation.mutate(),
    saveExceptionPending: createExceptionMutation.isLoading,
  };
}
