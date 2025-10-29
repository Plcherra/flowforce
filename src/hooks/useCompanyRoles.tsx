
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
  is_active: boolean;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
}

export interface CompanyRolesError {
  message: string;
  code?: string;
  status?: number;
}

export interface UseCompanyRolesOptions {
  onboarding?: boolean;
}

const MINIMAL_ONBOARDING_ROLES: CompanyRole[] = [
  {
    id: 'onboarding-basic',
    name: 'Onboarding Staff',
    description: 'Temporary access during onboarding setup',
    color: '#6b7280',
    icon: 'Users',
    hierarchy_level: 1,
    permissions: {
      viewOwnProfile: true,
      editOwnProfile: true,
      viewOwnSchedules: true
    },
    is_system_role: true,
    is_active: true
  }
];

const UNKNOWN_ERROR_MESSAGE = 'Unable to load company roles';

const normalizeError = (error: unknown): CompanyRolesError => {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string; status?: number };
    return {
      message: typeof err.message === 'string' && err.message.length > 0 ? err.message : UNKNOWN_ERROR_MESSAGE,
      code: typeof err.code === 'string' ? err.code : undefined,
      status: typeof err.status === 'number' ? err.status : undefined
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: UNKNOWN_ERROR_MESSAGE };
};

const isMissingCompanyError = (error: CompanyRolesError) => {
  if (error.code === 'PGRST116') {
    return true;
  }

  const lowerMessage = error.message.toLowerCase();
  return lowerMessage.includes('company');
};

export function useCompanyRoles(options: UseCompanyRolesOptions = {}) {
  const { onboarding = false } = options;
  const { user } = useAuth();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CompanyRolesError | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchRoles = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const metadataCompanyId =
        typeof user.user_metadata?.company_id === 'string'
          ? (user.user_metadata.company_id as string)
          : null;

      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (currentProfileError) {
        console.error('Error resolving current profile for company roles:', currentProfileError);
      }

      const companyId = currentProfile?.company_id ?? metadataCompanyId;

      if (!companyId) {
        throw new Error('No company context available for role listing');
      }

      const { data, error: rpcError } = await supabase.rpc('get_company_roles', {
        company_uuid: companyId,
      });

      if (rpcError) {
        throw rpcError;
      }

      const parsedRoles = (data || []).map((role: any) => ({
        ...role,
        permissions: typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : (role.permissions || {})
      }));

      setRoles(parsedRoles);
    } catch (err: unknown) {
      console.error('Error fetching company roles:', err);
      const normalizedError = normalizeError(err);
      setError(normalizedError);

      if (onboarding && isMissingCompanyError(normalizedError)) {
        setRoles([...MINIMAL_ONBOARDING_ROLES]);
      } else {
        setRoles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, onboarding]);

  useEffect(() => {
    if (user) {
      fetchRoles().catch((err) => {
        console.error('Unhandled error while fetching company roles:', err);
      });
    } else {
      setRoles([]);
      setError(null);
      setLoading(false);
    }
  }, [user, fetchRoles]);

  const createRole = useMutation({
    mutationFn: async (roleData: CreateRoleData) => {
      if (!user) throw new Error('User not authenticated');

      // Creating role...

      // Get the user's company_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      if (!profile?.company_id) {
        throw new Error('No company found for user');
      }

      const { data, error } = await supabase
        .from('company_roles')
        .insert({
          ...roleData,
          company_id: profile.company_id,
          permissions: roleData.permissions,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating role:', error);
        throw error;
      }
      
      // Role created successfully
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      fetchRoles();
    },
    onError: (error: any) => {
      console.error('Create role mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    }
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyRole> & { id: string }) => {
      // Updating role...
      
      const { data, error } = await supabase
        .from('company_roles')
        .update({
          ...updates,
          permissions: updates.permissions || undefined
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating role:', error);
        throw error;
      }
      
      // Role updated successfully
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      fetchRoles();
    },
    onError: (error: any) => {
      console.error('Update role mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      // Deactivating role...
      
      const { error } = await supabase
        .from('company_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) {
        console.error('Error deactivating role:', error);
        throw error;
      }
      
      // Role deactivated successfully
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role deactivated successfully",
      });
      fetchRoles();
    },
    onError: (error: any) => {
      console.error('Delete role mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate role",
        variant: "destructive",
      });
    }
  });

  return {
    roles,
    loading,
    isLoading: loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    refetchRoles: fetchRoles
  };
}
