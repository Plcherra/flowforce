import { useEffect, useState, useCallback } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
  todaysShifts: number;
  pendingTimeOff: number;
  approvedTimeOffUpcoming: number;
  timeOffDaysUsed: number;
  timeOffBalanceRemaining: number;
}

type ScheduleRow = {
  id: string;
  start_time: string;
  company_id: string | null;
};

type PendingTimeOffRow = {
  id: string;
  company_id: string | null;
};

type ApprovedTimeOffRow = {
  start_date: string | null;
  end_date: string | null;
  company_id: string | null;
};

const TIME_OFF_ALLOWANCE_PER_EMPLOYEE = 25;
const DEFAULT_STATS: DashboardStats = {
  totalEmployees: 0,
  activeEmployees: 0,
  totalDepartments: 0,
  todaysShifts: 0,
  pendingTimeOff: 0,
  approvedTimeOffUpcoming: 0,
  timeOffDaysUsed: 0,
  timeOffBalanceRemaining: 0,
};

const FALLBACK_STATS: DashboardStats = {
  totalEmployees: 42,
  activeEmployees: 38,
  totalDepartments: 6,
  todaysShifts: 12,
  pendingTimeOff: 4,
  approvedTimeOffUpcoming: 5,
  timeOffDaysUsed: 128,
  timeOffBalanceRemaining: 922,
};

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const fetchDashboardData = useCallback(async () => {
    if (!companyId) {
      setStats(DEFAULT_STATS);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const todayIso = new Date().toISOString().split('T')[0];
      const dayStart = `${todayIso}T00:00:00`;
      const dayEnd = `${todayIso}T23:59:59`;

      const [
        employeesResponse,
        departmentsResponse,
        schedulesResponse,
        requestedRequestsResponse,
        approvedRequestsResponse,
      ] = await Promise.all([
        supabase.from('profiles').select('employment_status').eq('company_id', companyId),
        supabase.from('departments').select('id').eq('company_id', companyId),
        supabase
          .from('schedules')
          .select('id, start_time, company_id')
          .eq('company_id', companyId)
          .gte('start_time', dayStart)
          .lt('start_time', dayEnd),
        supabase
          .from('time_off_requests')
          .select('id, company_id')
          .eq('company_id', companyId)
          .eq('status', 'requested'),
        supabase
          .from('time_off_requests')
          .select('start_date, end_date, company_id')
          .eq('company_id', companyId)
          .eq('status', 'approved'),
      ]);

      const failedResponses = [
        { label: 'profiles', response: employeesResponse },
        { label: 'departments', response: departmentsResponse },
        { label: 'schedules', response: schedulesResponse },
        { label: 'time_off_requests (requested)', response: requestedRequestsResponse },
        { label: 'time_off_requests (approved)', response: approvedRequestsResponse },
      ].filter(({ response }) => response.error);

      if (failedResponses.length > 0) {
        failedResponses.forEach(({ label, response }) => {
          console.error('[useDashboardData] Query failed', {
            label,
            companyId,
            error: response.error,
          });
        });
        const messages = failedResponses
          .map(({ label, response }) => `${label}: ${response.error?.message ?? 'unknown error'}`)
          .join('; ');
        throw new Error(messages);
      }

      const employees = employeesResponse.data ?? [];
      const departments = departmentsResponse.data ?? [];
      const rawSchedules = (schedulesResponse.data ?? []) as ScheduleRow[];
      const rawRequestedRequests = (requestedRequestsResponse.data ?? []) as PendingTimeOffRow[];
      const rawApprovedRequests = (approvedRequestsResponse.data ?? []) as ApprovedTimeOffRow[];

      const schedules = rawSchedules.filter((entry) => entry?.company_id === companyId);
      if (schedules.length !== rawSchedules.length) {
        console.warn('[useDashboardData] Filtered schedules from other companies', JSON.stringify({ removed: rawSchedules.length - schedules.length, companyId }));
      }

      const timeOffRequests = rawRequestedRequests.filter((entry) => entry?.company_id === companyId);
      if (timeOffRequests.length !== rawRequestedRequests.length) {
        console.warn('[useDashboardData] Filtered requested time off from other companies', JSON.stringify({ removed: rawRequestedRequests.length - timeOffRequests.length, companyId }));
      }

      const approvedTimeOff = rawApprovedRequests.filter((entry) => entry?.company_id === companyId);
      if (approvedTimeOff.length !== rawApprovedRequests.length) {
        console.warn('[useDashboardData] Filtered approved time off requests from other companies', JSON.stringify({ removed: rawApprovedRequests.length - approvedTimeOff.length, companyId }));
      }

      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(employee => employee?.employment_status === 'active').length;
      const totalDepartments = departments.length;
      const todaysShifts = schedules.length;
      const pendingTimeOff = timeOffRequests.length;

      const approvedUpcoming = approvedTimeOff.filter(request => {
        if (!request.end_date) return false;
        return new Date(request.end_date) >= new Date();
      }).length;

      const currentYearStart = new Date(new Date().getFullYear(), 0, 1);
      const approvedDaysUsed = approvedTimeOff.reduce((total, request) => {
        if (!request.start_date || !request.end_date) return total;
        const requestStart = new Date(request.start_date);
        const requestEnd = new Date(request.end_date);
        if (requestEnd < currentYearStart) return total;
        const effectiveStart = requestStart < currentYearStart ? currentYearStart : requestStart;
        const span = differenceInCalendarDays(requestEnd, effectiveStart) + 1;
        return total + Math.max(span, 0);
      }, 0);

      const estimatedAllowance = totalEmployees * TIME_OFF_ALLOWANCE_PER_EMPLOYEE;
      const balanceRemaining = Math.max(estimatedAllowance - approvedDaysUsed, 0);

      setStats({
        totalEmployees,
        activeEmployees,
        totalDepartments,
        todaysShifts,
        pendingTimeOff,
        approvedTimeOffUpcoming: approvedUpcoming,
        timeOffDaysUsed: approvedDaysUsed,
        timeOffBalanceRemaining: balanceRemaining,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      console.error('Error fetching dashboard data:', error);
      setError(errorMessage);
      setStats(FALLBACK_STATS);
      toast({
        title: "Error loading dashboard",
        description: `${errorMessage}. Showing sample data for now.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    if (companyId) {
      fetchDashboardData();
    }
  }, [companyId, fetchDashboardData]);

  const refetch = useCallback(() => {
    return fetchDashboardData();
  }, [fetchDashboardData]);

  return { 
    stats, 
    loading, 
    error, 
    refetch 
  };
}
