
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

export function usePermissions() {
  const { profile, loading: profileLoading } = useProfile();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { data: overrides, isLoading: overridesLoading } = useUserPermissionOverrides(profile?.id || null);

  // Memoize the permission calculations using the new resolver
  const permissionHelpers = useMemo(() => {
    if (profileLoading || rolesLoading || overridesLoading || !profile?.role) {
      return {
        can: () => false,
        hasRole: () => false,
        role: undefined,
        positionRole: undefined,
        getDisplayRole: () => 'Loading...',
        isLoading: true
      };
    }

    const role = profile.role as UserRole;
    const positionRole = profile.position?.role as UserRole | undefined;
    const effectiveRole = positionRole || role;

    // Find the company role configuration
    const companyRole = Array.isArray(roles) 
      ? roles.find(r => r.name.toLowerCase() === effectiveRole.toLowerCase())
      : undefined;

    // Create permission context for the resolver
    const context: PermissionContext = {
      rolePermissions: companyRole?.permissions || {},
      userOverrides: overrides || [],
      userId: profile.id,
      roleId: companyRole?.id
    };

    // Create resolver instance
    const resolver = createPermissionResolver(context);

    // Role hierarchy for hasRole function
    const roleHierarchy = {
      'staff': 1,
      'supervisor': 2,
      'manager': 3,
      'admin': 4,
      'owner': 5
    };

    const getCurrentRoleLevel = () => roleHierarchy[effectiveRole] || 0;

    const can = (permission: Permission): boolean => {
      return resolver.resolve(permission as any);
    };

    const hasRole = (requiredRole: string | string[]): boolean => {
      if (!profile?.role) return false;
      
      if (Array.isArray(requiredRole)) {
        return requiredRole.some(r => {
          const requiredLevel = roleHierarchy[r as UserRole] || 0;
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
      
      // Use company role name if available
      if (companyRole?.name) {
        return companyRole.name;
      }
      
      // Fallback to profile role with proper capitalization
      return profile?.role 
        ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
        : 'Employee';
    };

    return {
      can,
      hasRole,
      role,
      positionRole,
      getDisplayRole,
      isLoading: false
    };
  }, [profile, roles, overrides, profileLoading, rolesLoading, overridesLoading]);

  return permissionHelpers;
}
