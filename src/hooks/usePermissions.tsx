
// Update existing usePermissions hook to use the new resolver
import { useMemo } from 'react';
import { useProfile } from './useProfile';
import { useCompanyRoles } from './useCompanyRoles';
import { useUserPermissionOverrides } from './useUserPermissions';
import { createPermissionResolver, type PermissionContext } from '@/lib/permissions/resolver';

type Permission = 
  | 'viewOwnProfile'
  | 'viewTeamProfiles' 
  | 'editOwnProfile'
  | 'editTeamProfiles'
  | 'viewOwnSchedules'
  | 'viewTeamSchedules'
  | 'editSchedules'
  | 'viewOwnTasks'
  | 'viewTeamTasks'
  | 'editTasks'
  | 'viewOwnExpenses'
  | 'viewTeamExpenses'
  | 'approveExpenses'
  | 'approveTimeOff'
  | 'manageUsers'
  | 'systemSettings'
  | 'createForms'
  | 'manageForms'
  | 'approveFormSubmissions'
  | 'managePositions'
  | 'viewAIInsights'
  | 'manageInventory'
  | 'managePayments';

type UserRole = 'staff' | 'supervisor' | 'manager' | 'admin' | 'owner';

const defaultPermissionHelpers = {
  can: () => false,
  hasRole: () => false,
  role: undefined as UserRole | undefined,
  positionRole: undefined as UserRole | undefined,
  getDisplayRole: () => 'Loading...',
  isLoading: true,
};

export function usePermissions() {
  const { profile, loading: profileLoading } = useProfile();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { data: overrides, isLoading: overridesLoading } = useUserPermissionOverrides(profile?.id || null);

  if (profileLoading || rolesLoading || overridesLoading) {
    return defaultPermissionHelpers;
  }

  if (!profile?.role) {
    return {
      ...defaultPermissionHelpers,
      isLoading: false,
      getDisplayRole: () => 'Employee',
    };
  }

  const roleHierarchy: Record<UserRole, number> = {
    staff: 1,
    supervisor: 2,
    manager: 3,
    admin: 4,
    owner: 5,
  };

  const profileRole = profile.role as UserRole;
  const positionRole = profile.position?.role as UserRole | undefined;
  const effectiveRole = (positionRole || profileRole) as UserRole;
  const companyRole = Array.isArray(roles)
    ? roles.find((role) => role.name.toLowerCase() === effectiveRole.toLowerCase())
    : undefined;

  const context: PermissionContext = {
    rolePermissions: companyRole?.permissions || {},
    userOverrides: overrides || [],
    userId: profile.id,
    roleId: companyRole?.id,
  };

  const resolver = createPermissionResolver(context);
  const getCurrentRoleLevel = () => roleHierarchy[effectiveRole] || 0;

  const can = (permission: Permission): boolean => {
    try {
      return resolver.resolve(permission as any);
    } catch (error) {
      console.error('Failed to resolve permission', error);
      return false;
    }
  };

  const hasRole = (requiredRole: string | string[]): boolean => {
    if (!profile?.role) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.some((roleKey) => {
        const requiredLevel = roleHierarchy[roleKey as UserRole] || 0;
        return getCurrentRoleLevel() >= requiredLevel;
      });
    }

    const requiredLevel = roleHierarchy[requiredRole as UserRole] || 0;
    return getCurrentRoleLevel() >= requiredLevel;
  };

  const getDisplayRole = (): string => {
    if (profile?.position?.name) {
      return profile.position.name;
    }

    if (companyRole?.name) {
      return companyRole.name;
    }

    return profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Employee';
  };

  return {
    can,
    hasRole,
    role: profileRole,
    positionRole,
    getDisplayRole,
    isLoading: false,
  };
}
