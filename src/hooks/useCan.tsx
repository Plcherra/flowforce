import { useMemo, useRef } from 'react';
import { useProfile } from './useProfile';
import { useCompanyRoles } from './useCompanyRoles';
import { useUserPermissionOverrides, type PermissionKey } from './useUserPermissions';
import { createPermissionResolver, type PermissionContext } from '@/lib/permissions/resolver';
import { usePermissionAudit } from './usePermissionAudit';

/**
 * Hook for checking permissions using the resolver system
 * @param permissionKey - Optional specific permission to check
 * @returns Object with can function and resolver instance
 */
export function useCan(permissionKey?: PermissionKey) {
  const { profile, loading: profileLoading } = useProfile();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const { data: overrides, isLoading: overridesLoading } = useUserPermissionOverrides(profile?.id || null);
  const { logPermissionCheck } = usePermissionAudit();
  
  // Cache resolved permissions to avoid recalculation
  const permissionCache = useRef<Record<string, boolean>>({});
  const lastContextHash = useRef<string>('');

  const permissionResult = useMemo(() => {
    // Return loading state if any dependency is loading
    if (profileLoading || rolesLoading || overridesLoading || !profile) {
      // Clear cache when loading
      permissionCache.current = {};
      lastContextHash.current = '';
      return {
        can: () => false,
        canAny: () => false,
        canAll: () => false,
        getSource: () => 'role' as const,
        resolver: null,
        isLoading: true,
        permissions: {}
      };
    }

    // Find the user's role with better fallback handling
    const userRole = roles?.find(role => {
      // First try to match by role_id
      if (profile.role_id && role.id === profile.role_id) {
        return true;
      }
      // Fallback to matching by name (case insensitive)
      if (profile.role && role.name.toLowerCase() === profile.role.toLowerCase()) {
        return true;
      }
      return false;
    });

    // Create permission context
    const context: PermissionContext = {
      rolePermissions: userRole?.permissions || {},
      userOverrides: overrides || [],
      userId: profile.id,
      roleId: profile.role_id || undefined
    };

    // Debug logging for permission resolution (only in development)
    if (process.env.NODE_ENV === 'development' && !userRole) {
      console.warn('[useCan] No matching role found for user:', {
        userId: profile.id,
        userRole: profile.role,
        userRoleId: profile.role_id,
        availableRoles: roles?.map(r => ({ id: r.id, name: r.name }))
      });
    }

    // Create context hash for cache invalidation
    const contextHash = JSON.stringify({
      userId: profile.id,
      roleId: profile.role_id,
      role: profile.role,
      rolePermissions: userRole?.permissions || {},
      overrides: overrides || []
    });

    // Clear cache if context changed
    if (lastContextHash.current !== contextHash) {
      permissionCache.current = {};
      lastContextHash.current = contextHash;
    }

    // Create resolver instance
    const resolver = createPermissionResolver(context);

    // Cached permission checking function with audit logging
    const can = (key: PermissionKey): boolean => {
      if (permissionCache.current[key] !== undefined) {
        return permissionCache.current[key];
      }
      const result = resolver.resolve(key);
      const source = resolver.getPermissionSource(key);
      
      // Cache the result
      permissionCache.current[key] = result;
      
      // Log the permission check for audit (async, non-blocking)
      logPermissionCheck(key, result, source).catch(console.error);
      
      return result;
    };

    // If specific permission requested, resolve it immediately
    const specificPermission = permissionKey ? can(permissionKey) : undefined;

    return {
      can,
      canAny: (keys: PermissionKey[]) => resolver.hasAny(keys),
      canAll: (keys: PermissionKey[]) => resolver.hasAll(keys),
      getSource: (key: PermissionKey) => resolver.getPermissionSource(key),
      resolver,
      isLoading: false,
      permissions: resolver.resolveAll(),
      // For specific permission queries
      hasPermission: specificPermission,
      permissionSource: permissionKey ? resolver.getPermissionSource(permissionKey) : undefined
    };
  }, [profile, roles, overrides, profileLoading, rolesLoading, overridesLoading, permissionKey]);

  return permissionResult;
}

/**
 * Simple hook to check a single permission
 * @param permissionKey - Permission to check
 * @returns boolean - Permission result
 */
export function useCanCheck(permissionKey: PermissionKey): boolean {
  const { can, isLoading } = useCan();
  
  if (isLoading) return false;
  return can(permissionKey);
}

/**
 * Hook to check multiple permissions with different strategies
 * @param permissionKeys - Array of permissions to check
 * @param strategy - 'any' (has at least one) or 'all' (has all permissions)
 * @returns boolean - Permission result
 */
export function useCanMultiple(
  permissionKeys: PermissionKey[], 
  strategy: 'any' | 'all' = 'any'
): boolean {
  const { canAny, canAll, isLoading } = useCan();
  
  if (isLoading) return false;
  
  return strategy === 'any' ? canAny(permissionKeys) : canAll(permissionKeys);
}

/**
 * Hook that returns all resolved permissions for the current user
 * @returns Record of all permissions
 */
export function useAllPermissions(): Record<string, boolean> {
  const { permissions, isLoading } = useCan();
  
  if (isLoading) return {};
  return permissions;
}