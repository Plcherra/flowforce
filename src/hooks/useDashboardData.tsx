import { useEffect, useState, useCallback } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const TIME_OFF_ALLOWANCE_PER_EMPLOYEE = 25;

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDepartments: 0,
    todaysShifts: 0,
    pendingTimeOff: 0,
    approvedTimeOffUpcoming: 0,
    timeOffDaysUsed: 0,
    timeOffBalanceRemaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch employee statistics
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('employment_status');

      if (employeesError) throw employeesError;

      const { data: departments, error: departmentsError } = await supabase
        .from('departments')
        .select('id');

      if (departmentsError) throw departmentsError;

      const today = new Date().toISOString().split('T')[0];
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .gte('start_time', today)
        .lt('start_time', `${today}T23:59:59`);

      if (schedulesError) throw schedulesError;

      const { data: timeOffRequests, error: timeOffError } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('status', 'pending');

      if (timeOffError) throw timeOffError;

      const { data: approvedTimeOff, error: approvedError } = await supabase
        .from('time_off_requests')
        .select('start_date, end_date')
        .eq('status', 'approved');

      if (approvedError) throw approvedError;

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(emp => emp.employment_status === 'active').length || 0;
      const totalDepartments = departments?.length || 0;
      const todaysShifts = schedules?.length || 0;
      const pendingTimeOff = timeOffRequests?.length || 0;
      const approvedUpcoming = (approvedTimeOff ?? []).filter(request => {
        if (!request.end_date) return false;
        return new Date(request.end_date) >= new Date();
      }).length;

      const currentYearStart = new Date(new Date().getFullYear(), 0, 1);
      const approvedDaysUsed = (approvedTimeOff ?? []).reduce((total, request) => {
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
      
      toast({
        title: "Error loading dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { 
    stats, 
    loading, 
    error, 
    refetch 
  };
}
