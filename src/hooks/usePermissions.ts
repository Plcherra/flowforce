export * from './usePermissions.tsx';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import type { TeamRole } from './useTeamManagement';
import { useToast } from '@/hooks/use-toast';

const SUPPORTED_PERMISSION_KEYS = [
  {
    key: 'invite_employees',
    label: 'Invite Employees',
    description: 'Allow this role to send new team invitations.',
  },
  {
    key: 'manage_roles',
    label: 'Manage Roles',
    description: 'Allow this role to assign and update team roles.',
  },
  {
    key: 'assign_permissions',
    label: 'Assign Permissions',
    description: 'Allow this role to modify company permission presets.',
  },
] as const;

type PermissionFlag = (typeof SUPPORTED_PERMISSION_KEYS)[number];

type RolePermissionSet = TeamRole;

export function usePermissionFlags() {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rolesQuery = useQuery({
    queryKey: ['permission-flags', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<RolePermissionSet[]> => {
      if (!companyId) return [];

      try {
        const { data, error } = await supabase
          .from('company_roles')
          .select('id, name, permissions')
          .eq('company_id', companyId)
          .order('hierarchy_level', { ascending: true });

        if (error) {
          console.error('Failed to load permission flags', error);
          return [];
        }

        return (data ?? []).map((role) => ({
          id: role.id,
          name: role.name,
          permissions: normalizePermissions(role.permissions),
        }));
      } catch (error) {
        console.error('Unexpected permission flags query error', error);
        return [];
      }
    },
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({
      roleId,
      key,
      value,
    }: {
      roleId: string;
      key: PermissionFlag['key'];
      value: boolean;
    }) => {
      const existing = rolesQuery.data?.find((role) => role.id === roleId);
      const permissions = { ...(existing?.permissions ?? {}) };
      permissions[key] = value;

      const { error } = await supabase.from('company_roles').update({ permissions }).eq('id', roleId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-flags'] });
      toast({
        title: 'Permissions updated',
        description: 'Role permissions saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Unable to update permissions',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
      });
    },
  });

  const roleOptions = Array.isArray(rolesQuery.data)
    ? rolesQuery.data.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.permissions,
      }))
    : [];

  return {
    roles: roleOptions,
    isLoading: rolesQuery.isLoading,
    featureKeys: SUPPORTED_PERMISSION_KEYS,
    updateFlag: updateFlagMutation.mutateAsync,
    isUpdating: updateFlagMutation.isPending,
  };
}

function normalizePermissions(raw: unknown): Record<string, boolean> {
  if (!raw) return {};

  if (typeof raw === 'string') {
    try {
      return normalizePermissions(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, boolean>>((acc, key) => {
      if (typeof key === 'string') {
        acc[key] = true;
      }
      return acc;
    }, {});
  }

  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, boolean | number | string>)
      .filter(([, value]) => Boolean(value))
      .reduce<Record<string, boolean>>((acc, [key]) => {
        acc[key] = true;
        return acc;
      }, {});
  }

  return {};
}
