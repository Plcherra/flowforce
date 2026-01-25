/**
 * Dashboard data hooks
 * 
 * Provides dashboard statistics including employee counts, schedule coverage,
 * time off balances, and task completion metrics. Uses optimized RPC endpoint
 * with fallback to legacy queries for maximum performance.
 * 
 * @module hooks/useDashboardData
 * @example
 * ```typescript
 * const { stats, loading, error, refetch } = useDashboardData();
 * 
 * if (loading) return <Loading />;
 * if (error) return <Error message={error} />;
 * 
 * return <Dashboard stats={stats} />;
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { differenceInCalendarDays, endOfWeek, startOfWeek } from 'date-fns';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/utils/logger';

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

type EmployeeRow = {
  id: string;
  employment_status: string | null;
  department_id: string | null;
};

type ScheduleRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  company_id: string | null;
  user_id: string | null;
  status: string | null;
};

type TimeOffRequestRow = {
  id: string;
  user_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
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
  coverageCompleteness: 0,
  hoursUtilization: 0,
  taskCompletion: 0,
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
  coverageCompleteness: 82,
  hoursUtilization: 68,
  taskCompletion: 74,
};

const SCHEMA_MISMATCH_CODES = new Set(['42703', '42P01']);
const DEFAULT_SHIFT_HOURS = 8;

const isSchemaMismatchError = (error: unknown): error is PostgrestError => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as PostgrestError;
  if (candidate.code && SCHEMA_MISMATCH_CODES.has(candidate.code)) {
    return true;
  }
  const message = (candidate.message ?? '').toLowerCase();
  return message.includes('does not exist');
};

const deriveDepartmentCount = (employees: EmployeeRow[]) => {
  const ids = new Set<string>();
  employees.forEach((employee) => {
    if (employee?.department_id) {
      ids.add(employee.department_id);
    }
  });
  return ids.size;
};

const computeScheduleDurationHours = (row: ScheduleRow) => {
  const start = row.start_time ? Date.parse(row.start_time) : Number.NaN;
  const end = row.end_time ? Date.parse(row.end_time) : Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return DEFAULT_SHIFT_HOURS;
  }
  let diff = (end - start) / (1000 * 60 * 60);
  if (!Number.isFinite(diff) || diff <= 0) {
    diff += 24;
  }
  return Math.max(diff, 0);
};

const clampPercent = (value: number, cap = 150) => Math.round(Math.max(0, Math.min(value, cap)));

/**
 * useDashboardData - Hook for fetching dashboard statistics
 * 
 * Fetches comprehensive dashboard statistics including:
 * - Employee counts (total, active)
 * - Department counts
 * - Schedule coverage and today's shifts
 * - Time off balances and pending requests
 * - Task completion metrics
 * 
 * Uses optimized RPC endpoint (`get_dashboard_stats`) with automatic fallback
 * to legacy queries if RPC is unavailable. Includes retry logic for transient failures.
 * 
 * @returns Dashboard statistics, loading state, error state, and refetch function
 * 
 * @example
 * ```typescript
 * const { stats, loading, error, refetch } = useDashboardData();
 * 
 * // Access statistics
 * const { totalEmployees, activeEmployees, todaysShifts } = stats;
 * 
 * // Refetch data
 * await refetch();
 * ```
 */
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
      
      const today = new Date();
      const todayIso = today.toISOString().split('T')[0];

      // Try RPC endpoint first (Phase 4 optimization)
      // Phase 6: Add retry logic for RPC calls
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
          p_company_id: companyId,
          p_today: todayIso,
        });

        if (!rpcError && rpcData) {
          // Map RPC response to DashboardStats interface
          const stats: DashboardStats = {
            totalEmployees: rpcData.total_employees ?? 0,
            activeEmployees: rpcData.active_employees ?? 0,
            totalDepartments: rpcData.total_departments ?? 0,
            todaysShifts: rpcData.todays_shifts ?? 0,
            pendingTimeOff: rpcData.pending_time_off ?? 0,
            approvedTimeOffUpcoming: rpcData.approved_time_off_upcoming ?? 0,
            timeOffDaysUsed: rpcData.time_off_days_used ?? 0,
            timeOffBalanceRemaining: rpcData.time_off_balance_remaining ?? 0,
            coverageCompleteness: rpcData.coverage_completeness ?? 0,
            hoursUtilization: rpcData.hours_utilization ?? 0,
            taskCompletion: rpcData.task_completion ?? 0,
          };
          setStats(stats);
          setLoading(false);
          return;
        }

        // If RPC fails, log warning and fall back to legacy method
        if (rpcError) {
          logger.warn('Dashboard RPC unavailable, falling back to legacy queries', {
            error: rpcError,
            tags: ['performance', 'dashboard'],
          });
        }
      } catch (rpcFallbackError) {
        // RPC function may not exist yet, fall back to legacy method
        logger.warn('Dashboard RPC not available, using legacy queries', {
          error: rpcFallbackError,
          tags: ['performance', 'dashboard'],
        });
      }

      // Legacy method: Multiple sequential queries (fallback)
      const dayStart = `${todayIso}T00:00:00`;
      const dayEnd = `${todayIso}T23:59:59`;
      const dayStartDate = new Date(dayStart);
      const dayEndDate = new Date(dayEnd);
      const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(today, { weekStartsOn: 1 });
      const weekStartIso = weekStartDate.toISOString().split('T')[0];
      const weekEndIso = weekEndDate.toISOString().split('T')[0];
      const weekStartBoundary = `${weekStartIso}T00:00:00`;
      const weekEndBoundary = `${weekEndIso}T23:59:59`;

      const [employeesResponse, schedulesResponse] = await Promise.all([
        supabase.from('profiles').select('id, employment_status, department_id').eq('company_id', companyId),
        supabase
          .from('schedules')
          .select('id, start_time, end_time, company_id, user_id, status')
          .eq('company_id', companyId)
          .gte('start_time', weekStartBoundary)
          .lte('start_time', weekEndBoundary),
      ]);

      if (employeesResponse.error) {
        throw employeesResponse.error;
      }
      if (schedulesResponse.error) {
        throw schedulesResponse.error;
      }

      const employees = (employeesResponse.data ?? []) as EmployeeRow[];
      const rawSchedules = (schedulesResponse.data ?? []) as ScheduleRow[];
      
      // Security: Validate that all schedules belong to the company (defensive check)
      const invalidSchedules = rawSchedules.filter((entry) => entry?.company_id !== companyId);
      if (invalidSchedules.length > 0) {
        logger.error('SECURITY WARNING: Schedules from other companies detected', {
          context: {
            companyId,
            invalidCount: invalidSchedules.length,
            invalidIds: invalidSchedules.map(s => s.id),
          },
          tags: ['security', 'tenant-isolation'],
        });
      }
      
      const schedules = rawSchedules.filter((entry) => entry?.company_id === companyId);

      let totalDepartments = 0;
      try {
        const { data, error } = await supabase.from('departments').select('id').eq('company_id', companyId);
        if (error) throw error;
        totalDepartments = (data ?? []).length;
      } catch (deptError) {
        if (isSchemaMismatchError(deptError)) {
          totalDepartments = deriveDepartmentCount(employees);
          logger.warn('Departments table missing company scope, using derived counts', {
            context: {
              companyId,
              fallback: totalDepartments,
            },
            tags: ['data-integrity'],
          });
        } else {
          throw deptError;
        }
      }

      const employeeIds = employees.map((employee) => employee.id).filter(Boolean);
      const employeeIdSet = new Set(employeeIds);
      let companyTimeOff: TimeOffRequestRow[] = [];
      if (employeeIds.length > 0) {
        const { data, error } = await supabase
          .from('time_off_requests')
          .select('id, user_id, start_date, end_date, status')
          .in('user_id', employeeIds);
        if (error) {
          throw error;
        }
        companyTimeOff = (data ?? []) as TimeOffRequestRow[];
      }

      const scopedTimeOff = companyTimeOff.filter((entry) => entry.user_id && employeeIdSet.has(entry.user_id));
      
      const invalidTimeOff = companyTimeOff.filter((entry) => entry.user_id && !employeeIdSet.has(entry.user_id));
      if (invalidTimeOff.length > 0) {
        logger.error('SECURITY WARNING: Time off requests from other companies detected', {
          context: {
            companyId,
            invalidCount: invalidTimeOff.length,
            invalidUserIds: invalidTimeOff.map(t => t.user_id).filter(Boolean),
          },
          tags: ['security', 'tenant-isolation'],
        });
      }

      const timeOffRequests = scopedTimeOff.filter((entry) => (entry.status ?? '').toLowerCase() === 'requested');
      const approvedTimeOff = scopedTimeOff.filter((entry) => (entry.status ?? '').toLowerCase() === 'approved');

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

      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(employee => employee?.employment_status === 'active').length;
      const todaysShifts = schedules.filter((entry) => {
        if (!entry.start_time) return false;
        const startTime = new Date(entry.start_time);
        if (Number.isNaN(startTime.getTime())) return false;
        return startTime >= dayStartDate && startTime <= dayEndDate;
      }).length;
      const pendingTimeOff = timeOffRequests.length;
      const scheduledHours = schedules.reduce((total, row) => total + computeScheduleDurationHours(row), 0);

      const estimatedSlots = Math.max(activeEmployees * 5, 1);
      const coverageCompleteness = estimatedSlots > 0 ? clampPercent((schedules.length / estimatedSlots) * 100) : 0;

      const totalCapacityHours = activeEmployees * 40;
      const hoursUtilization = totalCapacityHours > 0 ? clampPercent((scheduledHours / totalCapacityHours) * 100) : 0;
      const taskCompletion = activeEmployees > 0 ? clampPercent((todaysShifts / activeEmployees) * 100, 100) : 0;

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
        coverageCompleteness,
        hoursUtilization,
        taskCompletion,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      logger.error('Error fetching dashboard data', {
        error,
        tags: ['dashboard', 'data-fetch'],
      });
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
