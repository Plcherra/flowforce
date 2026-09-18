import { useMemo } from "react";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyRoles, type CompanyRole } from "@/hooks/useCompanyRoles";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import { useDepartments } from "@/features/employees/hooks/useDepartments";
import {
  canInviteProductLevel,
  parseInviteGrantPolicy,
  resolveInviterLevel,
} from "@/features/roles/constants/grantCeiling";
import {
  isInviteableClass,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import type { OrganizationLocation } from "@/hooks/useLocations";

export function useInviteAccessOptions() {
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { profile, loading: profileLoading } = useProfile();
  const { company } = useCompany();
  const { permissions: inviterPermissions, isLoading: canLoading } = useCan();
  const invitePolicy = parseInviteGrantPolicy(company?.template_config);
  const inviterClass = (Array.isArray(roles) ? roles : []).find(
    (role) => role.id === profile?.role_id,
  );
  const inviterLevel = resolveInviterLevel({
    product_level: inviterClass?.product_level,
    name: inviterClass?.name,
    role: profile?.role,
    hierarchy_level: inviterClass?.hierarchy_level,
  });
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { departments } = useDepartments({
    companyId,
    profileLoading,
  });
  const locations: OrganizationLocation[] = [];

  const classes = useMemo(
    () =>
      (Array.isArray(roles) ? roles : []).filter(
        (role) =>
          role.is_active &&
          isInviteableClass(role) &&
          canInviteProductLevel(
            inviterLevel,
            resolveProductLevel(role),
            invitePolicy,
          ),
      ),
    [roles, inviterLevel, invitePolicy],
  );

  const defaultClass = useMemo(
    () =>
      classes.find((role) => role.product_level === "staff") ??
      classes[0] ??
      null,
    [classes],
  );

  return {
    classes,
    defaultClass,
    locations,
    departments,
    inviterLevel,
    inviterPermissions,
    invitePolicy,
    showLocations: false,
    showDepartments: departments.length > 1,
    isLoading: rolesLoading || profileLoading || Boolean(canLoading),
  };
}

export function findInviteClass(
  classes: CompanyRole[],
  roleId?: string | null,
): CompanyRole | undefined {
  return classes.find((role) => role.id === roleId);
}
