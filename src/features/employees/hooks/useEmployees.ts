import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/public-types";
import {
  employeesRepository,
  type EmployeeProfileRow,
} from "@/features/employees/repositories/employeesRepository";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

type ProfileRow = Tables<"profiles">;

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

export type UseEmployeesOptions = {
  includeInactive?: boolean;
  companyId?: string | null;
  enabled?: boolean;
};

const EMPLOYEE_CHUNK_SIZE = 100;

// UUID validation pattern
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return UUID_PATTERN.test(value);
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) return [items];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize));
  }
  return result;
};

const fetchInChunks = async <T>(
  ids: string[],
  fetcher: (chunk: string[]) => Promise<T[]>,
  chunkSize = EMPLOYEE_CHUNK_SIZE,
): Promise<T[]> => {
  if (!ids.length) return [];

  try {
    const chunks = chunkArray(ids, chunkSize);
    const results = await Promise.all(chunks.map((chunk) => fetcher(chunk)));
    return results.flat();
  } catch (error) {
    logger.error("Failed to load chunked employee data", {
      error,
      tags: ["error"],
    });
    return [];
  }
};

const buildEmployeeRecords = async (
  companyId: string,
  includeInactive: boolean,
): Promise<Employee[]> => {
  try {
    const employeeList: EmployeeProfileRow[] =
      await employeesRepository.fetchCompanyEmployees({
        companyId,
        includeInactive,
      });

    if (!Array.isArray(employeeList) || employeeList.length === 0) {
      return [];
    }

    const ids = employeeList.map((employee) => employee.id);
    if (!ids.length) {
      return [];
    }

    const lookback = dayjs().subtract(30, "day").format("YYYY-MM-DD");

    // Try RPC endpoint first (Phase 4 optimization)
    let skillsData: Tables<"skill_matrix">[] = [];
    let badgesData: Tables<"employee_badge">[] = [];
    let reportsData: Tables<"employee_report">[] = [];
    let attendanceData: Tables<"staff_performance">[] = [];

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_employee_enrichment",
        {
          p_company_id: companyId,
          p_employee_ids: ids,
          p_lookback_date: lookback,
        },
      );

      if (!rpcError && rpcData) {
        // Parse RPC response
        skillsData = (rpcData.skills ?? []) as Tables<"skill_matrix">[];
        badgesData = (rpcData.badges ?? []) as Tables<"employee_badge">[];
        reportsData = (rpcData.reports ?? []) as Tables<"employee_report">[];
        attendanceData = (rpcData.attendance ??
          []) as Tables<"staff_performance">[];
      } else if (rpcError) {
        logger.warn(
          "Employee enrichment RPC unavailable, using legacy queries",
          {
            error: rpcError,
            tags: ["performance", "employees"],
          },
        );
        throw rpcError; // Fall through to legacy method
      }
    } catch (rpcFallbackError) {
      // Legacy method: Multiple sequential queries (fallback)
      logger.warn(
        "Employee enrichment RPC not available, using legacy queries",
        {
          error: rpcFallbackError,
          tags: ["performance", "employees"],
        },
      );

      [skillsData, badgesData, reportsData, attendanceData] = await Promise.all(
        [
          fetchInChunks(ids, (chunk) =>
            employeesRepository.fetchSkillMatrixForEmployees(chunk),
          ),
          fetchInChunks(ids, (chunk) =>
            employeesRepository.fetchEmployeeBadges(chunk),
          ),
          fetchInChunks(ids, (chunk) =>
            employeesRepository.fetchEmployeeReports({
              employeeIds: chunk,
              since: lookback,
            }),
          ),
          fetchInChunks(ids, (chunk) =>
            employeesRepository.fetchStaffPerformance({
              employeeIds: chunk,
              since: lookback,
            }),
          ),
        ],
      );
    }

    const skillMap = new Map<string, { level: number; xp: number }>();
    (skillsData ?? []).forEach((row) => {
      const current = skillMap.get(row.employee_id);
      if (!current || row.xp > current.xp) {
        skillMap.set(row.employee_id, { level: row.level, xp: row.xp });
      }
    });

    const badgeMap = new Map<string, string[]>();
    (badgesData ?? []).forEach((row) => {
      const list = badgeMap.get(row.employee_id) ?? [];
      list.push(row.badge_code);
      badgeMap.set(row.employee_id, list);
    });

    const positiveReportMap = new Map<string, number>();
    (reportsData ?? []).forEach((row) => {
      if (row.severity >= 4) {
        positiveReportMap.set(
          row.employee_id,
          (positiveReportMap.get(row.employee_id) ?? 0) + 1,
        );
      }
    });

    const attendanceMap = new Map<string, { noShows: number; lates: number }>();
    (attendanceData ?? []).forEach((row) => {
      if (!row.user_id) return;
      const entry = attendanceMap.get(row.user_id) ?? { noShows: 0, lates: 0 };
      if (row.attendance_status === "absent") {
        entry.noShows += 1;
      }
      if (row.attendance_status === "late") {
        entry.lates += 1;
      }
      attendanceMap.set(row.user_id, entry);
    });

    return employeeList.map((employee) => {
      const skill = skillMap.get(employee.id) ?? { level: 1, xp: 0 };
      const badges = badgeMap.get(employee.id) ?? [];
      const positives = positiveReportMap.get(employee.id) ?? 0;
      const attendanceCounts = attendanceMap.get(employee.id) ?? {
        noShows: 0,
        lates: 0,
      };
      const reliability = Math.max(
        0,
        Math.min(
          100,
          100 -
            10 * attendanceCounts.noShows -
            3 * attendanceCounts.lates +
            5 * positives,
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
  } catch (error) {
    let errorObj: Error;
    if (error instanceof Error) {
      errorObj = error;
    } else if (typeof error === "object" && error !== null) {
      // Handle Supabase or other structured errors
      const errorData = error as Record<string, unknown>;
      errorObj = new Error((errorData.message as string) || String(error));
      if (errorData.code)
        (errorObj as Error & { code?: string }).code = String(errorData.code);
      if (errorData.details)
        (errorObj as Error & { details?: string }).details = String(
          errorData.details,
        );
      if (errorData.hint)
        (errorObj as Error & { hint?: string }).hint = String(errorData.hint);
    } else {
      errorObj = new Error(String(error));
    }

    logger.error("Failed to build employee records", {
      error: errorObj,
      context: {
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      },
      tags: ["error", "employees"],
    });
    throw errorObj;
  }
};

export const employeesQueryKey = (
  companyId: string | null | undefined,
  includeInactive = false,
) =>
  [
    "employees",
    companyId ?? "unknown",
    includeInactive ? "all" : "active",
  ] as const;

export function useEmployees(options: UseEmployeesOptions = {}) {
  const {
    includeInactive = false,
    companyId: companyIdOverride = null,
    enabled = true,
  } = options;
  const { user } = useAuth();
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(
    null,
  );
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const metadataCompanyId =
    typeof user?.user_metadata?.company_id === "string"
      ? (user.user_metadata.company_id as string)
      : null;

  useEffect(() => {
    let active = true;
    if (!enabled || !user?.id || companyIdOverride) {
      setResolvedCompanyId(null);
      setContextLoading(false);
      setContextError(null);
      return () => {
        active = false;
      };
    }

    setContextLoading(true);
    setContextError(null);
    employeesRepository
      .fetchProfileCompanyContext(user.id)
      .then((companyId) => {
        if (active) {
          setResolvedCompanyId(companyId);
          setContextError(null);
        }
      })
      .catch((error) => {
        logger.error("Failed to resolve company context", {
          error,
          tags: ["error"],
        });
        if (active) {
          setResolvedCompanyId(null);
          setContextError("Unable to resolve company context.");
        }
      })
      .finally(() => {
        if (active) {
          setContextLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id, companyIdOverride, enabled]);

  const effectiveCompanyId =
    companyIdOverride ?? resolvedCompanyId ?? metadataCompanyId;
  
  // Validate company context before querying tenant-scoped employee data.
  const isValidCompanyId = isValidUUID(effectiveCompanyId);
  
  const queryKey = employeesQueryKey(effectiveCompanyId, includeInactive);

  const queryResult = useQuery<Employee[]>({
    queryKey,
    enabled: Boolean(enabled && user?.id && effectiveCompanyId && isValidCompanyId),
    queryFn: async () => {
      if (!effectiveCompanyId || !isValidCompanyId) {
        logger.debug("Skipping employee fetch - invalid company ID", {
          companyId: effectiveCompanyId,
          tags: ["employees"],
        });
        return [];
      }
      return buildEmployeeRecords(effectiveCompanyId, includeInactive);
    },
    staleTime: 30 * 1000,
  });

  const employees =
    enabled && Array.isArray(queryResult.data) ? queryResult.data : [];
  const loading = enabled ? contextLoading || queryResult.isPending : false;
  const effectiveError =
    contextError ??
    (enabled
      ? queryResult.error instanceof Error
        ? queryResult.error.message
        : queryResult.error
          ? String(queryResult.error)
          : null
      : null);
  const getEmployeesByPosition = (positionId: string) =>
    employees.filter((emp) => emp.position?.id === positionId);
  const getEmployeeFullName = (employee: Employee) => {
    const first = employee.first_name ?? "";
    const last = employee.last_name ?? "";
    const fullName = `${first} ${last}`.trim();
    return fullName || employee.email || "Unnamed teammate";
  };
  const usingFallbackCompany =
    enabled && !companyIdOverride && !resolvedCompanyId && !metadataCompanyId;

  return {
    employees,
    loading,
    error: effectiveError,
    getEmployeesByPosition,
    getEmployeeFullName,
    refetchEmployees: queryResult.refetch,
    queryKey,
    companyId: effectiveCompanyId ?? null,
    usingFallbackData: usingFallbackCompany,
  };
}
