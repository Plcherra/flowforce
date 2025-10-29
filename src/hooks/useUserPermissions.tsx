import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  type PermissionDefinition,
  type PermissionKey,
  type PermissionValue,
} from '@/lib/permissions/registry';
import { createPermissionResolver } from '@/lib/permissions/resolver';
import { logAuditEvent } from '@/services/audit/auditService';

export { PERMISSION_DEFINITIONS, PERMISSION_KEYS } from '@/lib/permissions/registry';
export type { PermissionDefinition, PermissionKey, PermissionValue } from '@/lib/permissions/registry';

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_key: PermissionKey;
  permission_value: PermissionValue;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EffectivePermission {
  key: PermissionKey;
  value: PermissionValue;
  effective: boolean;
  source: 'role' | 'allow_override' | 'deny_override';
  definition?: PermissionDefinition;
}

// Hook to fetch user permission overrides
export function useUserPermissionOverrides(userId: string | null) {
  return useQuery({
    queryKey: ['user-permission-overrides', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as UserPermissionOverride[];
    },
    enabled: !!userId,
  });
}

// Hook to get effective permissions for a user (role permissions + overrides)
export function useUserEffectivePermissions(userId: string | null, roleId: string | null) {
  return useQuery({
    queryKey: ['user-effective-permissions', userId, roleId],
    queryFn: async () => {
      if (!userId || !roleId) {
        return [];
      }

      const [{ data: role, error: roleError }, { data: overrideData, error: overrideError }] = await Promise.all([
        supabase
          .from('company_roles')
          .select('permissions')
          .eq('id', roleId)
          .single(),
        supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId),
      ]);

      if (roleError) throw roleError;
      if (overrideError) throw overrideError;

      const overrides = (overrideData || []) as UserPermissionOverride[];
      const rawPermissions = role?.permissions ?? {};
      const rolePermissions = typeof rawPermissions === 'string' ? JSON.parse(rawPermissions) : rawPermissions;

      const resolver = createPermissionResolver({
        rolePermissions: rolePermissions || {},
        userOverrides: overrides,
        userId,
        roleId,
      });

      const effectivePermissions: EffectivePermission[] = PERMISSION_KEYS.map((key) => {
        const override = overrides.find((item) => item.permission_key === key);
        return {
          key,
          value: override?.permission_value ?? ('inherit' as PermissionValue),
          effective: resolver.resolve(key),
          source: resolver.getPermissionSource(key),
          definition: PERMISSION_DEFINITIONS.find((definition) => definition.key === key),
        };
      });

      return effectivePermissions;
    },
    enabled: !!userId && !!roleId,
  });
}

// Hook to save user permission overrides
export function useSaveUserPermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions: Record<PermissionKey, PermissionValue> 
    }) => {
      const { data: existingData, error: existingError } = await supabase
        .from('user_permissions')
        .select('permission_key, permission_value')
        .eq('user_id', userId);

      if (existingError) throw existingError;

      const previousOverrideValues = ((existingData ?? []) as Pick<UserPermissionOverride, 'permission_key' | 'permission_value'>[]).reduce<Record<string, PermissionValue>>(
        (acc, override) => {
          acc[override.permission_key] = override.permission_value;
          return acc;
        },
        {},
      );

      // Delete existing overrides for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Get current user ID for created_by field
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Insert new overrides (only non-inherit values)
      const overridesToInsert = Object.entries(permissions)
        .filter(([_, value]) => value !== 'inherit')
        .map(([key, value]) => ({
          user_id: userId,
          permission_key: key as PermissionKey,
          permission_value: value,
          created_by: currentUserId
        }));

      if (overridesToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(overridesToInsert);

        if (error) throw error;
      }

      const nextOverrideValues = overridesToInsert.reduce<Record<string, PermissionValue>>(
        (acc, override) => {
          acc[override.permission_key] = override.permission_value;
          return acc;
        },
        {},
      );

      const normalize = (valueMap: Record<string, PermissionValue>) => {
        const sortedKeys = Object.keys(valueMap).sort();
        return sortedKeys.reduce<Record<string, PermissionValue>>((acc, key) => {
          acc[key] = valueMap[key];
          return acc;
        }, {});
      };

      const previousNormalized = normalize(previousOverrideValues);
      const nextNormalized = normalize(nextOverrideValues);

      if (JSON.stringify(previousNormalized) !== JSON.stringify(nextNormalized)) {
        await logAuditEvent({
          targetUserId: userId,
          action: 'permission.overrides_updated',
          tableName: 'user_permissions',
          recordId: userId,
          oldValues: Object.keys(previousNormalized).length ? previousNormalized : null,
          newValues: Object.keys(nextNormalized).length ? nextNormalized : null,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', variables.userId] });
      toast({
        title: 'Success',
        description: 'User permissions updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update permissions: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook to update user role
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, roleId, role }: { userId: string; roleId: string; role: 'admin' | 'manager' | 'employee' | 'staff' | 'supervisor' | 'owner' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role_id: roleId,
          role: role 
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update user role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
