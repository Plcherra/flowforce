import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  employee_id: string;
}

export interface DirectoryRole {
  id: string;
  name: string;
  permissions: string[];
}

export function useProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profiles', user?.id ?? 'guest'],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [] as Profile[];

      try {
        const metadataCompanyId =
          typeof user.user_metadata?.company_id === 'string'
            ? (user.user_metadata.company_id as string)
            : null;

        const companyId = await resolveCompanyId(user.id, metadataCompanyId);

        if (!companyId) {
          return [];
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) {
          logger.error('Failed to load profiles', { error, tags: ['error'] });
          return [];
        }

        return (data ?? []) as Profile[];
      } catch (error) {
        logger.error('Unexpected profiles query error', { error, tags: ['error'] });
        return [];
      }
    },
  });
}

export function useRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['directory-roles', user?.id ?? 'guest'],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [] as DirectoryRole[];

      try {
        const metadataCompanyId =
          typeof user.user_metadata?.company_id === 'string'
            ? (user.user_metadata.company_id as string)
            : null;

        const companyId = await resolveCompanyId(user.id, metadataCompanyId);

        if (!companyId) {
          return [];
        }

        const { data, error } = await supabase
          .from('company_roles')
          .select('id, name, permissions')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('hierarchy_level', { ascending: true });

        if (error) {
          logger.error('Failed to load roles', { error, tags: ['error'] });
          return [];
        }

        return (data ?? []).map((role) => ({
          id: role.id,
          name: role.name,
          permissions: parsePermissions(role.permissions),
        }));
      } catch (error) {
        logger.error('Unexpected roles query error', { error, tags: ['error'] });
        return [];
      }
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, roleId }: { employeeId: string; roleId: string }) => {
      const { data: role, error: roleError } = await supabase
        .from('company_roles')
        .select('id, name')
        .eq('id', roleId)
        .maybeSingle();

      if (roleError) {
        throw roleError;
      }

      if (!role) {
        throw new Error('Selected role is no longer available.');
      }

      const normalizedRole = normalizeRoleName(role.name);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role_id: role.id,
          role: normalizedRole,
        })
        .eq('id', employeeId);

      if (profileError) {
        throw profileError;
      }

      await supabase
        .from('user_roles')
        .upsert(
          {
            user_id: employeeId,
            role: normalizedRole,
          },
          { onConflict: 'user_id, role' },
        );

      return { employeeId, roleId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['directory-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employee-access', variables.employeeId] });
      toast({
        title: 'Role updated',
        description: 'The employee role was updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    },
  });
}

function parsePermissions(raw: unknown): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string');
  }

  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, boolean>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([permission]) => permission);
  }

  if (typeof raw === 'string') {
    try {
      return parsePermissions(JSON.parse(raw));
    } catch {
      return raw
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeRoleName(roleName: string) {
  const normalized = roleName.toLowerCase();
  const allowed: Array<'admin' | 'manager' | 'employee' | 'staff' | 'supervisor' | 'owner'> = [
    'admin',
    'manager',
    'employee',
    'staff',
    'supervisor',
    'owner',
  ];

  if (allowed.includes(normalized as (typeof allowed)[number])) {
    return normalized as (typeof allowed)[number];
  }

  return 'staff';
}

async function resolveCompanyId(userId: string, fallback: string | null) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Failed to resolve company id for profile', { error, tags: ['error'] });
      return fallback;
    }

    return data?.company_id ?? fallback;
  } catch (error) {
    logger.error('Unexpected error resolving company id', { error, tags: ['error'] });
    return fallback;
  }
}
