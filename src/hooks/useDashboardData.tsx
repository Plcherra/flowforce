import { useState, useCallback, useEffect } from 'react';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
  todaysShifts: number;
  pendingTimeOff: number;
  approvedTimeOffUpcoming: number;
  timeOffDaysUsed: number;
  timeOffBalanceRemaining: number;
  coverageCompleteness: number;
  hoursUtilization: number;
  taskCompletion: number;
}

// Demo mock data for the dashboard
const MOCK_STATS: DashboardStats = {
  totalEmployees: 42,
  activeEmployees: 38,
  totalDepartments: 6,
  todaysShifts: 12,
  pendingTimeOff: 4,
  approvedTimeOffUpcoming: 5,
  timeOffDaysUsed: 128,
  timeOffBalanceRemaining: 922,
  coverageCompleteness: 82,
  hoursUtilization: 68,
  taskCompletion: 74,
};

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use mock data - database tables are not fully set up
    setStats(MOCK_STATS);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
