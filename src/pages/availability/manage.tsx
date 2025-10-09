import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  ShieldAlert,
  Unlock,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { SchedulingProvider, useScheduling } from '@/contexts/SchedulingContext';
import { DEFAULT_ORG_ID, getLockStateForWeek, computeAutoLockThreshold } from '@/availability/lockEngine';
import {
  cloneGrid,
  computeImpactScore,
  gridFromAvailabilityRows,
  hoursDelta,
  rangesFromGrid,
  type StaffAvailabilityRow,
} from '@/availability/availabilityUtils';
import type { AvailabilityGrid } from '@/components/availability/AvailabilityRequestForm';
import { notifyEmployeeDecision } from '@/notifications/availability';
import type { AvailabilityException, AvailabilityLockMode, AvailabilityRequest, OrgPrefs } from '@/types/availability';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';

interface ManagerAvailabilityRequest extends AvailabilityRequest {
  employeeName: string;
  originalAvailability: AvailabilityGrid;
  desiredAvailability: AvailabilityGrid;
  requestedRange: { start: string; end: string };
  reason: string;
  impactScore: number;
}

const HOURS = Array.from({ length: 16 }).map((_, index) => 6 + index); // 06 -> 21
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

dayjs.extend(relativeTime);

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

const dayOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const hourOptions = Array.from({ length: 24 }).map((_, index) => ({
  value: index.toString(),
  label: dayjs().hour(index).minute(0).format('h A'),
}));

export default function ManageAvailabilityPage() {
  return (
    <SchedulingProvider>
      <ManageAvailabilityContent />
    </SchedulingProvider>
  );
}

function ManageAvailabilityContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { loading: schedulingLoading, fetchStaffAvailability } = useScheduling();
  const queryClient = useQueryClient();

  const orgId = profile?.companyId ?? profile?.company_id ?? DEFAULT_ORG_ID;
  const resolvedRole = (profile?.role ?? '').toLowerCase();
  const canManageAvailability = ['manager', 'owner', 'company_admin', 'admin'].includes(resolvedRole);
  const hasOrgContext = Boolean(profile?.companyId ?? profile?.company_id);
  const queriesEnabled = canManageAvailability && hasOrgContext && !profileLoading;

  const [pendingMode, setPendingMode] = useState<AvailabilityLockMode>('open');
  const [pendingDay, setPendingDay] = useState('4');
  const [pendingHour, setPendingHour] = useState('17');

  const [exceptionForm, setExceptionForm] = useState({
    employeeId: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    reason: '',
  });

  const employeesQuery = useQuery({
    queryKey: ['availability-employees', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
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
            id: orgId,
            availabilityLockMode: 'open',
            autoLockDayOfWeek: 4,
            autoLockHour: 17,
            createdAt: '',
            updatedAt: '',
          };

      setPendingMode(prefs.availabilityLockMode);
      setPendingDay(String(prefs.autoLockDayOfWeek));
      setPendingHour(String(prefs.autoLockHour));

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
          status: request.status as AvailabilityRequest['status'],
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
      await fetchStaffAvailability();
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
      if (!user) throw new Error('Must be signed in to approve requests.');
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
        approved_by: user.id,
      });
      if (exceptionInsert.error) throw exceptionInsert.error;

      const updateResult = await supabase
        .from('availability_request')
        .update({
          status: 'approved',
          manager_id: user.id,
          decision_note: null,
        })
        .eq('id', request.id);
      if (updateResult.error) throw updateResult.error;

      const auditResult = await supabase.from('audit_log').insert({
        actor_id: user.id,
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
      await fetchStaffAvailability();
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
      if (!user) throw new Error('Must be signed in to deny requests.');
      const updateResult = await supabase
        .from('availability_request')
        .update({
          status: 'denied',
          manager_id: user.id,
          decision_note: note,
        })
        .eq('id', request.id);
      if (updateResult.error) throw updateResult.error;

      const auditResult = await supabase.from('audit_log').insert({
        actor_id: user.id,
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
      await fetchStaffAvailability();
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
        approved_by: user?.id ?? null,
      });
      if (insertResult.error) throw insertResult.error;

      if (user) {
        const auditResult = await supabase.from('audit_log').insert({
          actor_id: user.id,
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
      setExceptionForm({
        employeeId: '',
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        reason: '',
      });
      await invalidateAvailabilityQueries(queryClient, orgId);
      await fetchStaffAvailability();
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

  const lockStatePreview = useMemo(() => {
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

  if (profileLoading || schedulingLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading availability management..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-destructive/40">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <AlertTitle>Profile not found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load your profile details. Refresh the page or contact an administrator if the
            issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasOrgContext) {
    return (
      <div className="p-6">
        <Alert className="border-primary/40">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <AlertTitle>Organization context missing</AlertTitle>
          <AlertDescription>
            ConnectFlow needs an active company to manage availability. Add your company profile or reach out
            to support for help.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canManageAvailability) {
    return (
      <div className="p-6">
        <Alert className="border-primary/40">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <AlertTitle>Manager access required</AlertTitle>
          <AlertDescription>
            Only managers or owners can control team availability. Ask your administrator for the right
            permissions if you believe this is a mistake.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (
    queriesEnabled &&
    (employeesQuery.isLoading || orgPrefsQuery.isLoading || requestsQuery.isLoading || exceptionsQuery.isLoading)
  ) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading availability data..." />
      </div>
    );
  }

  const queryError =
    (employeesQuery.error as Error | undefined) ??
    (orgPrefsQuery.error as Error | undefined) ??
    (requestsQuery.error as Error | undefined) ??
    (exceptionsQuery.error as Error | undefined);

  if (queriesEnabled && queryError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-destructive/40">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {queryError.message || 'We ran into an unexpected error while loading availability data.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Availability Controls</h1>
        <p className="text-muted-foreground">
          Manage lock behaviour, approve requests, and handle availability exceptions for your team.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Lock controls
            </CardTitle>
            <CardDescription>Configure how and when employees can adjust their availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">Mode</Label>
              <RadioGroup
                value={pendingMode}
                onValueChange={(value) => setPendingMode(value as AvailabilityLockMode)}
                className="grid gap-3 md:grid-cols-3"
              >
                <ModeOption value="open" title="Open" description="Employees can edit availability anytime." />
                <ModeOption value="auto" title="Auto" description="Lock automatically before each week." />
                <ModeOption value="lock" title="Lock" description="Only managers can approve changes." />
              </RadioGroup>
            </div>

            {pendingMode === 'auto' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lock day</Label>
                  <Select value={pendingDay} onValueChange={(value) => setPendingDay(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lock hour</Label>
                  <Select value={pendingHour} onValueChange={(value) => setPendingHour(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {lockStatePreview?.nextLock && (
                  <div className="col-span-full flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary">
                    <Clock className="h-4 w-4" />
                    Next lock (based on current settings):{' '}
                    {dayjs(lockStatePreview.nextLock).format('ddd, MMM D h:mm A')}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => updatePrefsMutation.mutate()} disabled={updatePrefsMutation.isLoading}>
                {updatePrefsMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Per-person exceptions
            </CardTitle>
            <CardDescription>Allow individual employees to edit availability during locked periods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Employee</Label>
                <Select
                  value={exceptionForm.employeeId}
                  onValueChange={(value) => setExceptionForm((prev) => ({ ...prev, employeeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeesQuery.data ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {`${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || employee.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={exceptionForm.startDate}
                    onChange={(event) =>
                      setExceptionForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={exceptionForm.endDate}
                    min={exceptionForm.startDate}
                    onChange={(event) =>
                      setExceptionForm((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Why is this exception needed?"
                  value={exceptionForm.reason}
                  onChange={(event) => setExceptionForm((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => createExceptionMutation.mutate()} disabled={createExceptionMutation.isLoading}>
                {createExceptionMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save exception
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Existing exceptions</h3>
              <ScrollArea className="max-h-48 rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Dates</th>
                      <th className="px-3 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(exceptionsQuery.data ?? []).map((exception) => (
                      <tr key={exception.id} className="border-t">
                        <td className="px-3 py-2">
                          {employeesQuery.data?.find((emp) => emp.id === exception.employeeId)?.first_name ??
                            exception.employeeId}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {dayjs(exception.startDate).format('MMM D, YYYY')} –{' '}
                          {dayjs(exception.endDate).format('MMM D, YYYY')}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {exception.reason ?? '—'}
                        </td>
                      </tr>
                    ))}
                    {exceptionsQuery.data?.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-xs text-muted-foreground" colSpan={3}>
                          No exceptions configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Requests queue
          </CardTitle>
          <CardDescription>Review and manage availability change requests from employees.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="pending" className="space-y-3">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="denied">Denied</TabsTrigger>
            </TabsList>
            {(['pending', 'approved', 'denied'] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                <RequestsTable
                  tab={tab}
                  requests={requestsQuery.data ?? []}
                  employees={employeesQuery.data ?? []}
                  onApprove={(request) => approveRequestMutation.mutate(request)}
                  onDeny={(request, note) => denyRequestMutation.mutate({ request, note })}
                  pending={approveRequestMutation.isLoading || denyRequestMutation.isLoading}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ModeOption({
  value,
  title,
  description,
}: {
  value: AvailabilityLockMode;
  title: string;
  description: string;
}) {
  return (
    <Label
      htmlFor={`lock-${value}`}
      className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm transition hover:border-primary"
    >
      <RadioGroupItem value={value} id={`lock-${value}`} className="sr-only" />
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Label>
  );
}

function RequestsTable({
  tab,
  requests,
  employees,
  onApprove,
  onDeny,
  pending,
}: {
  tab: 'pending' | 'approved' | 'denied';
  requests: ManagerAvailabilityRequest[];
  employees: { id: string; first_name: string | null; last_name: string | null }[];
  onApprove: (request: ManagerAvailabilityRequest) => void;
  onDeny: (request: ManagerAvailabilityRequest, note: string) => void;
  pending: boolean;
}) {
  const filtered = useMemo(
    () => requests.filter((request) => request.status === tab),
    [requests, tab],
  );

  if (filtered.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-muted-foreground">
        No {tab} requests.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          employees={employees}
          onApprove={onApprove}
          onDeny={onDeny}
          pending={pending}
        />
      ))}
    </div>
  );
}

function RequestRow({
  request,
  employees,
  onApprove,
  onDeny,
  pending,
}: {
  request: ManagerAvailabilityRequest;
  employees: { id: string; first_name: string | null; last_name: string | null }[];
  onApprove: (request: ManagerAvailabilityRequest) => void;
  onDeny: (request: ManagerAvailabilityRequest, note: string) => void;
  pending: boolean;
}) {
  const [denialNote, setDenialNote] = useState('');
  const employeeLabel = useMemo(() => {
    const match = employees.find((employee) => employee.id === request.employeeId);
    if (match) return match;
    return { id: request.employeeId, first_name: request.employeeName, last_name: '' };
  }, [employees, request.employeeId, request.employeeName]);

  const diff = useMemo(() => {
    const lines: { day: string; added: number[]; removed: number[] }[] = [];
    DAY_LABELS.forEach((label, index) => {
      const original = new Set(request.originalAvailability[index] ?? []);
      const desired = new Set(request.desiredAvailability[index] ?? []);
      const added = Array.from(desired).filter((hour) => !original.has(hour));
      const removed = Array.from(original).filter((hour) => !desired.has(hour));
      if (added.length || removed.length) {
        lines.push({ day: label, added, removed });
      }
    });
    return lines;
  }, [request]);

  const hoursDiff = hoursDelta(request.originalAvailability, request.desiredAvailability);

  return (
    <div className="rounded-lg border p-4 shadow-sm transition hover:border-primary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            {`${employeeLabel.first_name ?? ''} ${employeeLabel.last_name ?? ''}`.trim() ||
              request.employeeName}
          </h3>
          <p className="text-xs text-muted-foreground">
            Week of {dayjs(request.weekStart).format('MMM D, YYYY')} · Submitted{' '}
            {dayjs(request.createdAt).fromNow()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1 text-xs uppercase">
            Impact score: {request.impactScore}
          </Badge>
          <Badge
            variant={
              request.status === 'approved'
                ? 'default'
                : request.status === 'denied'
                ? 'destructive'
                : 'secondary'
            }
          >
            {request.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 py-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Requested changes</p>
          <div className="mt-2 space-y-2 text-xs">
            {diff.map((entry) => (
              <div key={entry.day} className="flex items-center gap-2">
                <span className="w-16 font-medium">{entry.day}</span>
                {entry.added.length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {entry.added.map((hour) => dayjs().hour(hour).format('h A')).join(', ')}
                  </span>
                )}
                {entry.removed.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-3 w-3" />
                    {entry.removed.map((hour) => dayjs().hour(hour).format('h A')).join(', ')}
                  </span>
                )}
              </div>
            ))}
            {diff.length === 0 && <p>No hour-level changes detected.</p>}
          </div>
        </div>
        <div className="rounded-md border bg-muted/40 p-3 text-xs">
          <p className="font-semibold text-muted-foreground">Request details</p>
          <dl className="mt-2 space-y-2">
            <div className="flex justify-between">
              <dt>Range</dt>
              <dd className="text-muted-foreground">
                {dayjs(request.requestedRange.start).format('MMM D')} –{' '}
                {dayjs(request.requestedRange.end).format('MMM D')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Hour delta</dt>
              <dd className={cn(hoursDiff >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                {hoursDiff >= 0 ? '+' : ''}
                {hoursDiff} hrs
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Reason</dt>
              <dd className="text-muted-foreground">{request.reason || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {request.status === 'pending' ? (
        <div className="flex flex-col gap-3 border-t pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>
              Approve to apply changes immediately and grant a temporary exception. Deny to notify the employee.
            </p>
            <Textarea
              placeholder="Optional note when denying..."
              value={denialNote}
              onChange={(event) => setDenialNote(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onDeny(request, denialNote)}
              disabled={pending}
            >
              Deny
            </Button>
            <Button onClick={() => onApprove(request)} disabled={pending}>
              Approve
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            {request.status === 'approved' ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Approved by {request.managerId ?? 'manager'}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" />
                Denied by {request.managerId ?? 'manager'}
              </span>
            )}
          </span>
          {request.decisionNote && (
            <span className="text-xs text-muted-foreground">Note: {request.decisionNote}</span>
          )}
        </div>
      )}
    </div>
  );
}
