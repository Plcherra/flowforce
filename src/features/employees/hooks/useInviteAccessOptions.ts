import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyRoles, type CompanyRole } from "@/hooks/useCompanyRoles";
import { useProfile } from "@/hooks/useProfile";
import { useCan } from "@/hooks/useCan";
import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { logger } from "@/utils/logger";
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
import {
  actorCanInvite,
  locationsAssignableByActor,
} from "@/features/employees/utils/inviteLocation";
import { isPlaceholderStoreName } from "@/features/stores/storeDraft";

export function useInviteAccessOptions() {
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { profile, loading: profileLoading } = useProfile();
  const { company } = useCompany();
  const { permissions: inviterPermissions, isLoading: canLoading, can } =
    useCan();
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
  const storesQuery = useQuery({
    queryKey: ["invite-stores", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<OrganizationLocation[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase // pragma: allowlist secret
        .from("stores")
        .select("id, name, archived_at")
        .eq("company_id", companyId)
        .order("name", { ascending: true });
      if (error) {
        logger.error("Failed to load invite stores", {
          error,
          tags: ["error"],
        });
        return [];
      }
      return (data ?? [])
        .filter((row) => !row.archived_at && !isPlaceholderStoreName(row.name ?? ""))
        .map((row) => ({
          id: row.id,
          name: row.name?.trim() || row.id,
          is_active: true,
        }));
    },
  });
  const companyLocations = storesQuery.data ?? [];
  const locationsLoading = storesQuery.isPending;
  const assignableLocations = useMemo(() => {
    if (canLoading) return [];
    const allowedIds = new Set(
      locationsAssignableByActor({
        locations: companyLocations.map((location) => ({
          id: location.id,
          name: location.name,
          active: location.is_active !== false,
        })),
        actorLevel: inviterLevel,
        actorLocationId: profile?.storeId ?? profile?.locationId ?? null,
        canInvite: actorCanInvite({
          role: profile?.role ?? "",
          permissions: {
            ...inviterPermissions,
            manageUsers: can("manageUsers"),
          },
        }),
      }).map((location) => location.id),
    );
    return companyLocations.filter((location) => allowedIds.has(location.id));
  }, [
    can,
    canLoading,
    companyLocations,
    inviterLevel,
    inviterPermissions,
    profile?.storeId,
    profile?.locationId,
    profile?.role,
  ]);

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
    locations: assignableLocations,
    departments,
    inviterLevel,
    inviterPermissions,
    invitePolicy,
    showLocations: assignableLocations.length > 1,
    showDepartments: departments.length > 1,
    isLoading:
      rolesLoading ||
      profileLoading ||
      locationsLoading ||
      Boolean(canLoading),
  };
}

export function findInviteClass(
  classes: CompanyRole[],
  roleId?: string | null,
): CompanyRole | undefined {
  return classes.find((role) => role.id === roleId);
}
