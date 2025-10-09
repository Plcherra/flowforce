import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { CalendarCheck, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { SchedulingProvider, useScheduling } from '@/contexts/SchedulingContext';
import { useProfile } from '@/hooks/useProfile';
import { AvailabilityRequestForm, type AvailabilityGrid } from '@/components/availability/AvailabilityRequestForm';
import { DEFAULT_ORG_ID, startOfIsoWeek } from '@/availability/lockEngine';
import {
  cloneGrid,
  gridFromAvailabilityRows,
  rangesFromGrid,
  type StaffAvailabilityRow,
} from '@/availability/availabilityUtils';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function EmployeeAvailabilityPage() {
  return (
    <SchedulingProvider>
      <EmployeeAvailabilityContent />
    </SchedulingProvider>
  );
}

const hasId = (value: unknown): value is { id: string } =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof (value as { id: unknown }).id === 'string';

function EmployeeAvailabilityContent() {
  const { profile, loading: profileLoading } = useProfile();
  const { loading: schedulingLoading, refetchAll } = useScheduling();
  const queryClient = useQueryClient();

  const fallbackProfileId = hasId(profile) ? profile.id : null;
  const employeeId = profile?.userId ?? fallbackProfileId;
  const orgId = profile?.companyId ?? profile?.company_id ?? DEFAULT_ORG_ID;

  const weekStart = useMemo(() => {
    const isoStart = startOfIsoWeek(new Date());
    return isoStart.toISOString().slice(0, 10);
  }, []);

  const availabilityQuery = useQuery({
    queryKey: ['availability-grid', employeeId, weekStart],
    enabled: Boolean(employeeId) && !profileLoading,
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('staff_availability')
        .select('id, user_id, day_of_week, start_time, end_time, week_start_date')
        .eq('user_id', employeeId)
        .eq('week_start_date', weekStart);
      if (error) throw error;
      return (data ?? []) as StaffAvailabilityRow[];
    },
  });

  const initialGrid = useMemo<AvailabilityGrid>(() => {
    if (!availabilityQuery.data) return {};
    return cloneGrid(gridFromAvailabilityRows(availabilityQuery.data));
  }, [availabilityQuery.data]);

  const handleDirectSave = useCallback(
    async (nextGrid: AvailabilityGrid) => {
      if (!employeeId) {
        throw new Error('We need your profile details to save availability.');
      }
      const ranges = rangesFromGrid(nextGrid);

      const deleteResult = await supabase
        .from('staff_availability')
        .delete()
        .eq('user_id', employeeId)
        .eq('week_start_date', weekStart);
      if (deleteResult.error) {
        throw new Error(deleteResult.error.message || 'Unable to update your availability right now.');
      }

      if (ranges.length > 0) {
        const insertRows = ranges.map((range) => ({
          user_id: employeeId,
          day_of_week: range.dayOfWeek,
          start_time: range.startTime,
          end_time: range.endTime,
          week_start_date: weekStart,
          is_preferred: true,
        }));
        const insertResult = await supabase.from('staff_availability').insert(insertRows);
        if (insertResult.error) {
          throw new Error(insertResult.error.message || 'Unable to save the updated availability.');
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['availability-grid', employeeId, weekStart] });
      await refetchAll();
    },
    [employeeId, queryClient, refetchAll, weekStart],
  );

  if (profileLoading || schedulingLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading your availability..." />
      </div>
    );
  }

  if (!profile || !employeeId) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-destructive/40">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <AlertTitle>No profile found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load your profile information. Try reloading the page or contact your manager for help.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (availabilityQuery.isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Preparing your availability editor..." />
      </div>
    );
  }

  if (availabilityQuery.error) {
    const error = availabilityQuery.error as Error;
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-destructive/40">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <AlertTitle>Couldn&apos;t load availability</AlertTitle>
          <AlertDescription>{error.message || 'Please try again in a few moments.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <Card className="border bg-background shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarCheck className="h-5 w-5 text-primary" />
              My Availability
            </CardTitle>
            <CardDescription>
              Select when you&apos;re free to work. Submit a request if this week is locked by your manager.
            </CardDescription>
          </div>
          <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
            Week of {dayjs(weekStart).format('MMM D, YYYY')}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={cn('border-primary/30', (availabilityQuery.data?.length ?? 0) === 0 && 'border-dashed')}>
            <CalendarCheck className="h-5 w-5 text-primary" />
            <AlertTitle>
              {(availabilityQuery.data?.length ?? 0) === 0 ? 'No availability saved yet' : 'Update as needed'}
            </AlertTitle>
            <AlertDescription>
              Choose the hours you prefer to work each day. Locked weeks still let you submit a change request
              for manager approval.
            </AlertDescription>
          </Alert>

          <AvailabilityRequestForm
            orgId={orgId}
            employeeId={employeeId}
            weekStart={weekStart}
            initialAvailability={initialGrid}
            onSaveDirect={handleDirectSave}
          />
        </CardContent>
      </Card>
    </div>
  );
}
