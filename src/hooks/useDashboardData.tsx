import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
  todaysShifts: number;
  pendingTimeOff: number;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDepartments: 0,
    todaysShifts: 0,
    pendingTimeOff: 0,
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

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(emp => emp.employment_status === 'active').length || 0;
      const totalDepartments = departments?.length || 0;
      const todaysShifts = schedules?.length || 0;
      const pendingTimeOff = timeOffRequests?.length || 0;

      setStats({
        totalEmployees,
        activeEmployees,
        totalDepartments,
        todaysShifts,
        pendingTimeOff,
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