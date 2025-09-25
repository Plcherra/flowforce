import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// All available permission keys from the system - expanded with granular inventory permissions
export const PERMISSION_KEYS = [
  // Profile permissions
  'viewOwnProfile',
  'viewTeamProfiles',
  'editOwnProfile', 
  'editTeamProfiles',
  
  // Schedule permissions
  'schedule.view',
  'schedule.edit',
  'schedule.create',
  'schedule.delete',
  'viewOwnSchedules',
  'viewTeamSchedules',
  'editSchedules',
  
  // Task permissions
  'viewOwnTasks',
  'viewTeamTasks',
  'editTasks',
  
  // Expense permissions
  'viewOwnExpenses',
  'viewTeamExpenses',
  'approveExpenses',
  'approveTimeOff',
  
  // User management permissions
  'manageUsers',
  'systemSettings',
  
  // Form permissions
  'createForms',
  'manageForms',
  'approveFormSubmissions',
  
  // General permissions
  'managePositions',
  'viewAIInsights',
  'managePayments',
  
  // Directory permissions
  'directory.view',
  'directory.manage',
  
  // Inventory permissions - granular
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.delete',
  'inventory.adjust',
  'inventory.import',
  'inventory.export',
  'inventory.purchasing.view',
  'inventory.purchasing.manage',
  'inventory.counts.view',
  'inventory.counts.create',
  'inventory.counts.edit',
  'inventory.waste.view',
  'inventory.waste.create',
  'inventory.prep.view',
  'inventory.prep.edit',
  
  // Reports permissions
  'reports.view',
  'reports.export',
  
  // Billing permissions
  'billing.view',
  'billing.manage',
  
  // Admin Console permissions
  'admin.roles',
  'admin.permissions',
  'admin.settings',
  
  // Legacy permissions (maintain compatibility)
  'manageInventory'
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];
export type PermissionValue = 'inherit' | 'allow' | 'deny';

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
  source: 'role' | 'override';
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
  const { data: overrides } = useUserPermissionOverrides(userId);
  
  return useQuery({
    queryKey: ['user-effective-permissions', userId, roleId],
    queryFn: async () => {
      if (!userId || !roleId) return [];

      // Get role permissions
      const { data: role, error: roleError } = await supabase
        .from('company_roles')
        .select('permissions')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      const rolePermissions = role?.permissions || {};
      const overrideMap = new Map(
        (overrides || []).map(o => [o.permission_key, o.permission_value])
      );

      // Calculate effective permissions for all permission keys
      const effectivePermissions: EffectivePermission[] = PERMISSION_KEYS.map(key => {
        const override = overrideMap.get(key);
        
        if (override && override !== 'inherit') {
          return {
            key,
            value: override,
            effective: override === 'allow',
            source: 'override'
          };
        }

        // Use role permission or default to false
        const roleValue = rolePermissions[key] || false;
        return {
          key,
          value: 'inherit',
          effective: Boolean(roleValue),
          source: 'role'
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