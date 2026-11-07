import { createContext, useContext, type ReactNode } from "react";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useDepartments } from "@/features/employees/hooks/useDepartments";
import { useProfile } from "@/hooks/useProfile";
import {
  displayShiftDepartment,
  displayShiftRole,
  type ShiftDepartmentChoice,
  type ShiftRoleChoice,
} from "@/features/scheduling/utils/shiftRoleDepartment";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";

const ShiftCardLabelContext = createContext<{
  roles: ShiftRoleChoice[];
  departments: ShiftDepartmentChoice[];
}>({ roles: [], departments: [] });

export function ShiftCardLabelProvider({ children }: { children: ReactNode }) {
  const { roles } = useCompanyRoles();
  const { profile, loading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { departments } = useDepartments({ companyId, profileLoading: loading });
  return (
    <ShiftCardLabelContext.Provider
      value={{
        roles: roles.map((role) => ({ id: role.id, name: role.name })),
        departments: departments.map((department) => ({
          id: department.id,
          name: department.name,
        })),
      }}
    >
      {children}
    </ShiftCardLabelContext.Provider>
  );
}

export function useShiftCardText(shift: ShiftWithAssignments) {
  const { roles, departments } = useContext(ShiftCardLabelContext);
  const row = shift as { role?: string | null; requirements?: unknown };
  return {
    role: displayShiftRole({
      role: row.role,
      requirements: row.requirements,
      roles,
    }),
    department: displayShiftDepartment({
      requirements: row.requirements,
      departments,
    }),
  };
}
