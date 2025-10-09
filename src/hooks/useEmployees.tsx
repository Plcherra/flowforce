import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  employment_status: string;
  position?: {
    id: string;
    name: string;
    role: string;
  };
  skillLevel?: number;
  skillXp?: number;
  badges?: string[];
  reliability?: number;
  positiveReportCount?: number;
  lateCount?: number;
  noShowCount?: number;
}

export function useEmployees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setError(null);

      // Get current user's company to filter employees
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role,
          employment_status,
          position:positions(
            id,
            name,
            role
          )
        `)
        .eq('employment_status', 'active');

      // Filter by company if user has one
      if (currentProfile?.company_id) {
        query = query.eq('company_id', currentProfile.company_id);
      }

      const { data, error: fetchError } = await query.order('first_name', { ascending: true });

      if (fetchError) throw fetchError;

      const employeeList = data || [];
      const ids = employeeList.map((employee) => employee.id);

      if (ids.length === 0) {
        setEmployees([]);
        return;
      }

      const lookback = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

      const [skillsResult, badgesResult, reportsResult, attendanceResult] = await Promise.all([
        supabase
          .from('skill_matrix')
          .select('employee_id, role, level, xp')
          .in('employee_id', ids),
        supabase
          .from('employee_badge')
          .select('employee_id, badge_code')
          .in('employee_id', ids),
        supabase
          .from('employee_report')
          .select('employee_id, severity, date')
          .in('employee_id', ids)
          .gte('date', lookback),
        supabase
          .from('staff_performance')
          .select('user_id, attendance_status, date')
          .in('user_id', ids)
          .gte('date', lookback),
      ]);

      if (skillsResult.error) throw skillsResult.error;
      if (badgesResult.error) throw badgesResult.error;
      if (reportsResult.error) throw reportsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      const skillMap = new Map<string, { level: number; xp: number }>();
      (skillsResult.data ?? []).forEach((row) => {
        const current = skillMap.get(row.employee_id);
        if (!current || row.xp > current.xp) {
          skillMap.set(row.employee_id, { level: row.level, xp: row.xp });
        }
      });

      const badgeMap = new Map<string, string[]>();
      (badgesResult.data ?? []).forEach((row) => {
        const list = badgeMap.get(row.employee_id) ?? [];
        list.push(row.badge_code);
        badgeMap.set(row.employee_id, list);
      });

      const positiveReportMap = new Map<string, number>();
      (reportsResult.data ?? []).forEach((row) => {
        if (row.severity >= 4) {
          positiveReportMap.set(row.employee_id, (positiveReportMap.get(row.employee_id) ?? 0) + 1);
        }
      });

      const attendanceMap = new Map<string, { noShows: number; lates: number }>();
      (attendanceResult.data ?? []).forEach((row) => {
        const entry = attendanceMap.get(row.user_id) ?? { noShows: 0, lates: 0 };
        if (row.attendance_status === 'absent') {
          entry.noShows += 1;
        }
        if (row.attendance_status === 'late') {
          entry.lates += 1;
        }
        attendanceMap.set(row.user_id, entry);
      });

      const enriched = employeeList.map((employee) => {
        const skill = skillMap.get(employee.id) ?? { level: 1, xp: 0 };
        const badges = badgeMap.get(employee.id) ?? [];
        const positives = positiveReportMap.get(employee.id) ?? 0;
        const attendanceCounts = attendanceMap.get(employee.id) ?? { noShows: 0, lates: 0 };
        const reliability = Math.max(
          0,
          Math.min(
            100,
            100 - 10 * attendanceCounts.noShows - 3 * attendanceCounts.lates + 5 * positives,
          ),
        );

        return {
          ...employee,
          skillLevel: skill.level,
          skillXp: skill.xp,
          badges,
          reliability,
          positiveReportCount: positives,
          lateCount: attendanceCounts.lates,
          noShowCount: attendanceCounts.noShows,
        };
      });

      setEmployees(enriched);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setLoading(false);
    }
  }, [user, fetchEmployees]);

  const getEmployeesByPosition = (positionId: string) => {
    return employees.filter(emp => emp.position?.id === positionId);
  };

  const getEmployeeFullName = (employee: Employee) => {
    return `${employee.first_name} ${employee.last_name}`.trim();
  };

  return {
    employees,
    loading,
    error,
    getEmployeesByPosition,
    getEmployeeFullName,
    refetchEmployees: fetchEmployees,
  };
}
