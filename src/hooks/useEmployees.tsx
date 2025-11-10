import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/public-types';
import { employeesRepository } from '@/repositories/employeesRepository';

type ProfileRow = Tables<'profiles'>;

export type Employee = ProfileRow & {
  department?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  position?: {
    id: string;
    name: string;
    role: string;
  } | null;
  skillLevel?: number;
  skillXp?: number;
  badges?: string[];
  reliability?: number;
  positiveReportCount?: number;
  lateCount?: number;
  noShowCount?: number;
};

type UseEmployeesOptions = {
  includeInactive?: boolean;
};

const cacheKeyForCompany = (companyId: string, includeInactive: boolean) =>
  `${companyId}:${includeInactive ? 'all' : 'active'}`;

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { includeInactive = false } = options;
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const companyCacheRef = useRef<Map<string, Employee[]>>(new Map());

  const fetchEmployees = useCallback(async () => {
    const authUser = user;

    if (!authUser?.id) {
      setEmployees([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const metadataCompanyId =
        typeof authUser.user_metadata?.company_id === 'string'
          ? (authUser.user_metadata.company_id as string)
          : null;

      const currentProfileCompanyId = await employeesRepository.fetchProfileCompanyContext(authUser.id);
      const companyId = currentProfileCompanyId ?? metadataCompanyId;

      if (!companyId) {
        setError('No company context available');
        setEmployees([]);
        setLoading(false);
        return;
      }

      const cacheKey = cacheKeyForCompany(companyId, includeInactive);
      let cachedEmployees = companyCacheRef.current.get(cacheKey);

      if (!cachedEmployees && !includeInactive) {
        const rosterSnapshot = await employeesRepository.fetchRosterSnapshot(companyId);
        if (rosterSnapshot?.length) {
          cachedEmployees = rosterSnapshot as Employee[];
          companyCacheRef.current.set(cacheKey, cachedEmployees);
        }
      }

      if (cachedEmployees) {
        setEmployees(cachedEmployees);
      }

      const employeeList = await employeesRepository.fetchCompanyEmployees({
        companyId,
        includeInactive,
      });

      if (employeeList.length === 0) {
        companyCacheRef.current.set(cacheKey, []);
        setEmployees([]);
        setLoading(false);
        return;
      }

      const ids = employeeList.map((employee) => employee.id);

      if (!ids.length) {
        companyCacheRef.current.set(cacheKey, []);
        setEmployees([]);
        setLoading(false);
        return;
      }

      const lookback = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

      const [skillsData, badgesData, reportsData, attendanceData] = await Promise.all([
        employeesRepository.fetchSkillMatrixForEmployees(ids),
        employeesRepository.fetchEmployeeBadges(ids),
        employeesRepository.fetchEmployeeReports({ employeeIds: ids, since: lookback }),
        employeesRepository.fetchStaffPerformance({ employeeIds: ids, since: lookback }),
      ]);

      const skillMap = new Map<string, { level: number; xp: number }>();
      skillsData.forEach((row) => {
        const current = skillMap.get(row.employee_id);
        if (!current || row.xp > current.xp) {
          skillMap.set(row.employee_id, { level: row.level, xp: row.xp });
        }
      });

      const badgeMap = new Map<string, string[]>();
      badgesData.forEach((row) => {
        const list = badgeMap.get(row.employee_id) ?? [];
        list.push(row.badge_code);
        badgeMap.set(row.employee_id, list);
      });

      const positiveReportMap = new Map<string, number>();
      reportsData.forEach((row) => {
        if (row.severity >= 4) {
          positiveReportMap.set(row.employee_id, (positiveReportMap.get(row.employee_id) ?? 0) + 1);
        }
      });

      const attendanceMap = new Map<string, { noShows: number; lates: number }>();
      attendanceData.forEach((row) => {
        if (!row.user_id) return;
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
          department: employee.department ?? null,
          department_id: employee.department_id ?? null,
        };
      });

      setEmployees(enriched);
      companyCacheRef.current.set(cacheKey, enriched);
    } catch (err) {
      console.error('Error fetching employees:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(message || 'Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [user, includeInactive]);

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
