
import { useState, useEffect } from 'react';
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

export function useCompanyRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRoles();
    } else {
      setRoles([]);
      setLoading(false);
    }
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;

    try {
      // Fetching company roles...
      
      // Use the improved get_company_roles function
      const { data, error } = await supabase.rpc('get_company_roles');

      if (error) {
        console.error('Error from get_company_roles:', error);
        throw error;
      }
      
      // Raw roles data received
      
      // Parse the permissions field properly
      const parsedRoles = (data || []).map((role: any) => ({
        ...role,
        permissions: typeof role.permissions === 'string' ? 
          JSON.parse(role.permissions) : 
          (role.permissions || {})
      }));
      
      // Parsed roles processed
      setRoles(parsedRoles);
    } catch (error: any) {
      console.error('Error fetching company roles:', error);
      
      // If no company is set up yet, provide default roles for onboarding
      if (error.message?.includes('company') || error.code === 'PGRST116') {
        // No company found, providing default roles for onboarding
        setRoles([]);
      } else {
        // Fallback to system default roles
        // Using fallback default roles
        setRoles([
          { 
            id: 'temp-1', 
            name: 'Staff', 
            description: 'Basic staff member', 
            color: '#6b7280', 
            icon: 'Users', 
            hierarchy_level: 1, 
            permissions: {
              viewOwnProfile: true,
              editOwnProfile: true,
              viewOwnSchedules: true,
              viewOwnTasks: true,
              viewOwnExpenses: true,
              'inventory.view': true,
              'inventory.counts.view': true
            },
            is_system_role: true, 
            is_active: true 
          },
          { 
            id: 'temp-2', 
            name: 'Supervisor', 
            description: 'Team supervisor', 
            color: '#10b981', 
            icon: 'UserCheck', 
            hierarchy_level: 2, 
            permissions: {
              viewOwnProfile: true,
              editOwnProfile: true,
              viewOwnSchedules: true,
              viewOwnTasks: true,
              viewOwnExpenses: true,
              viewTeamProfiles: true,
              viewTeamTasks: true,
              editTasks: true,
              'inventory.view': true,
              'inventory.counts.view': true,
              'inventory.prep.view': true,
              'inventory.waste.view': true,
              'inventory.adjust': true,
              'inventory.counts.create': true,
              'inventory.counts.edit': true,
              'inventory.waste.create': true,
              'inventory.prep.edit': true,
              'inventory.export': true
            },
            is_system_role: true, 
            is_active: true 
          },
          { 
            id: 'temp-3', 
            name: 'Manager', 
            description: 'Department manager', 
            color: '#3b82f6', 
            icon: 'Shield', 
            hierarchy_level: 3, 
            permissions: {
              viewOwnProfile: true,
              editOwnProfile: true,
              viewOwnSchedules: true,
              viewOwnTasks: true,
              viewOwnExpenses: true,
              viewTeamProfiles: true,
              viewTeamTasks: true,
              editTasks: true,
              editSchedules: true,
              approveExpenses: true,
              approveTimeOff: true,
              'inventory.view': true,
              'inventory.counts.view': true,
              'inventory.prep.view': true,
              'inventory.waste.view': true,
              'inventory.purchasing.view': true,
              'inventory.create': true,
              'inventory.edit': true,
              'inventory.adjust': true,
              'inventory.counts.create': true,
              'inventory.counts.edit': true,
              'inventory.waste.create': true,
              'inventory.prep.edit': true,
              'inventory.purchasing.manage': true,
              'inventory.import': true,
              'inventory.export': true
            },
            is_system_role: true, 
            is_active: true 
          },
          { 
            id: 'temp-4', 
            name: 'Admin', 
            description: 'System administrator', 
            color: '#ef4444', 
            icon: 'Crown', 
            hierarchy_level: 4, 
            permissions: {
              viewOwnProfile: true,
              editOwnProfile: true,
              viewOwnSchedules: true,
              viewOwnTasks: true,
              viewOwnExpenses: true,
              viewTeamProfiles: true,
              viewTeamTasks: true,
              editTasks: true,
              editSchedules: true,
              approveExpenses: true,
              approveTimeOff: true,
              manageUsers: true,
              systemSettings: true,
              'inventory.view': true,
              'inventory.counts.view': true,
              'inventory.prep.view': true,
              'inventory.waste.view': true,
              'inventory.purchasing.view': true,
              'inventory.create': true,
              'inventory.edit': true,
              'inventory.delete': true,
              'inventory.adjust': true,
              'inventory.counts.create': true,
              'inventory.counts.edit': true,
              'inventory.waste.create': true,
              'inventory.prep.edit': true,
              'inventory.purchasing.manage': true,
              'inventory.import': true,
              'inventory.export': true
            },
            is_system_role: true, 
            is_active: true 
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

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
    createRole,
    updateRole,
    deleteRole,
    refetchRoles: fetchRoles
  };
}
