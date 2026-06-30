import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/hooks/useEmployees";

type StaffAvailabilityRow = {
  id: string;
  user_id: string | null;
};

type EmployeeCertificationRow = {
  id: string;
  employee_id: string | null;
  status: string | null;
  expires_at: string | null;
};

export type HrReadiness = {
  employeeCount: number;
  activeEmployeeCount: number;
  incompleteProfiles: number;
  missingDepartments: number;
  missingAvailability: number;
  missingCertifications: number;
  lowReliability: number;
};

const EMPTY_READINESS: HrReadiness = {
  employeeCount: 0,
  activeEmployeeCount: 0,
  incompleteProfiles: 0,
  missingDepartments: 0,
  missingAvailability: 0,
  missingCertifications: 0,
  lowReliability: 0,
};

function isActiveEmployee(employee: Employee) {
  return (employee.employment_status ?? "").toLowerCase() === "active";
}

function hasCompleteProfile(employee: Employee) {
  return Boolean(
    employee.first_name?.trim() &&
      employee.last_name?.trim() &&
      employee.email?.trim() &&
      employee.role?.trim() &&
      employee.employment_status?.trim(),
  );
}

function hasActiveCertification(row: EmployeeCertificationRow) {
  const status = (row.status ?? "").toLowerCase();
  if (["expired", "revoked", "inactive"].includes(status)) return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at) >= new Date();
}

export function useHrReadiness(params: {
  companyId: string | null;
  employees: Employee[];
  enabled?: boolean;
}) {
  const { companyId, employees, enabled = true } = params;
  const activeEmployees = useMemo(
    () => employees.filter(isActiveEmployee),
    [employees],
  );
  const activeEmployeeIds = useMemo(
    () => activeEmployees.map((employee) => employee.id).filter(Boolean),
    [activeEmployees],
  );

  return useQuery<HrReadiness>({
    queryKey: ["hr-readiness", companyId ?? "unknown", activeEmployeeIds],
    enabled: Boolean(enabled && companyId && activeEmployeeIds.length > 0),
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!companyId || activeEmployeeIds.length === 0) {
        return EMPTY_READINESS;
      }

      const [availabilityResult, certificationResult] = await Promise.all([
        supabase
          .from("staff_availability")
          .select("id,user_id")
          .in("user_id", activeEmployeeIds),
        supabase
          .from("employee_certifications")
          .select("id,employee_id,status,expires_at")
          .eq("company_id", companyId)
          .in("employee_id", activeEmployeeIds),
      ]);

      if (availabilityResult.error) throw availabilityResult.error;
      if (certificationResult.error) throw certificationResult.error;

      const availabilityRows =
        (availabilityResult.data ?? []) as StaffAvailabilityRow[];
      const certificationRows =
        (certificationResult.data ?? []) as EmployeeCertificationRow[];

      const availabilityUserIds = new Set(
        availabilityRows
          .map((row) => row.user_id)
          .filter((userId): userId is string => Boolean(userId)),
      );
      const certifiedUserIds = new Set(
        certificationRows
          .filter(hasActiveCertification)
          .map((row) => row.employee_id)
          .filter((employeeId): employeeId is string => Boolean(employeeId)),
      );

      return {
        employeeCount: employees.length,
        activeEmployeeCount: activeEmployees.length,
        incompleteProfiles: activeEmployees.filter(
          (employee) => !hasCompleteProfile(employee),
        ).length,
        missingDepartments: activeEmployees.filter(
          (employee) => !employee.departmentid,
        ).length,
        missingAvailability: activeEmployees.filter(
          (employee) => !availabilityUserIds.has(employee.id),
        ).length,
        missingCertifications: activeEmployees.filter(
          (employee) => !certifiedUserIds.has(employee.id),
        ).length,
        lowReliability: activeEmployees.filter(
          (employee) => (employee.reliability ?? 100) < 85,
        ).length,
      };
    },
    placeholderData: {
      ...EMPTY_READINESS,
      employeeCount: employees.length,
      activeEmployeeCount: activeEmployees.length,
      incompleteProfiles: activeEmployees.filter(
        (employee) => !hasCompleteProfile(employee),
      ).length,
      missingDepartments: activeEmployees.filter(
        (employee) => !employee.departmentid,
      ).length,
      lowReliability: activeEmployees.filter(
        (employee) => (employee.reliability ?? 100) < 85,
      ).length,
    },
  });
}
