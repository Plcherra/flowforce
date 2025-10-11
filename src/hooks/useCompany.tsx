import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/public-types';
import { CompanyRole, Position, CompanyConfig, CompanySettings } from '@/types/common';
import { handleError } from '@/utils/errorHandler';

type CompanyRow = Tables<'companies'>;

export interface Company {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  description?: string;
  website?: string;
  phone?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  currency: string;
  template_id?: string;
  template_name?: string;
  enabled_sections: string[];
  custom_roles: CompanyRole[];
  positions: Position[];
  template_config: CompanyConfig;
  timezone: string;
  working_hours: CompanySettings['working_hours'];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useCompany() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCompany();
    } else {
      setCompany(null);
      setLoading(false);
    }
  }, [user]);

  const parseCompanyData = (data: CompanyRow): Company => {
    return {
      ...data,
      enabled_sections: Array.isArray(data.enabled_sections) 
        ? data.enabled_sections 
        : JSON.parse(data.enabled_sections as string || '[]'),
      custom_roles: Array.isArray(data.custom_roles) 
        ? data.custom_roles 
        : JSON.parse(data.custom_roles as string || '[]'),
      positions: Array.isArray(data.positions) 
        ? data.positions 
        : JSON.parse(data.positions as string || '[]'),
      template_config: typeof data.template_config === 'object' 
        ? data.template_config 
        : JSON.parse(data.template_config as string || '{}'),
      working_hours: typeof data.working_hours === 'object' 
        ? data.working_hours 
        : JSON.parse(data.working_hours as string || '{}')
    };
  };

  const fetchCompany = async () => {
    if (!user) return;

    try {
      // First get the user's profile to find their company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, is_company_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw handleError(profileError, 'fetching user profile');
      }

      if (profile?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (companyError) {
          throw handleError(companyError, 'fetching company data');
        }

        setCompany(parseCompanyData(companyData));
      } else {
        setCompany(null);
      }
    } catch (error) {
      handleError(error, 'fetchCompany');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: {
    name: string;
    industry?: string;
    size?: string;
    description?: string;
    website?: string;
    phone?: string;
    primary_color?: string;
    secondary_color?: string;
    template_id?: string;
    template_name?: string;
    enabled_sections?: string[];
    custom_roles?: CompanyRole[];
    positions?: Position[];
    template_config?: CompanyConfig;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Ensure we have valid arrays for roles and positions
      const validatedRoles = Array.isArray(companyData.custom_roles) ? companyData.custom_roles : [];
      const validatedPositions = Array.isArray(companyData.positions) ? companyData.positions : [];

      // Make sure roles have proper structure for the database function
      const formattedRoles = validatedRoles.map(role => ({
        id: role.id || `role-${Date.now()}-${Math.random()}`,
        name: role.name,
        description: role.description || '',
        color: role.color || '#3b82f6',
        icon: role.icon || 'Users',
        hierarchy_level: role.hierarchy_level || 1,
        permissions: role.permissions || {},
        is_system_role: role.is_system_role || false
      }));

      // Format positions to match expected structure
      const formattedPositions = validatedPositions.map(position => ({
        id: position.id || `pos-${Date.now()}-${Math.random()}`,
        name: position.name,
        description: position.description || '',
        roleId: position.roleId,
        permissions: position.permissions || {}
      }));

      // Use the improved database function to create company with setup
      const { data, error } = await supabase.rpc('create_company_with_setup', {
        company_data: {
          name: companyData.name,
          industry: companyData.industry,
          size: companyData.size,
          description: companyData.description,
          website: companyData.website,
          phone: companyData.phone,
          primary_color: companyData.primary_color || '#3b82f6',
          secondary_color: companyData.secondary_color || '#1e40af',
          template_id: companyData.template_id,
          template_name: companyData.template_name,
          enabled_sections: companyData.enabled_sections || [],
          template_config: JSON.stringify(companyData.template_config || {})
        },
        custom_roles: formattedRoles,
        positions_data: formattedPositions,
        owner_user_id: user.id
      });

      if (error) {
        throw handleError(error, 'creating company with setup');
      }

      // Fetch the created company to return it
      const { data: createdCompany, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        throw handleError(fetchError, 'fetching created company');
      }

      const parsedCompany = parseCompanyData(createdCompany);
      setCompany(parsedCompany);

      // Refresh the company data to ensure everything is properly loaded
      await fetchCompany();

      return parsedCompany;
    } catch (error) {
      throw handleError(error, 'creating company');
    }
  };

  const updateCompany = async (updates: Partial<Company>) => {
    if (!company) throw new Error('No company to update');

    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...updates,
          enabled_sections: updates.enabled_sections ? JSON.stringify(updates.enabled_sections) : undefined,
          custom_roles: updates.custom_roles ? JSON.stringify(updates.custom_roles) : undefined,
          positions: updates.positions ? JSON.stringify(updates.positions) : undefined,
          template_config: updates.template_config ? JSON.stringify(updates.template_config) : undefined
        })
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;
      const parsedCompany = parseCompanyData(data);
      setCompany(parsedCompany);
      return parsedCompany;
    } catch (error) {
      throw handleError(error, 'updating company');
    }
  };

  return {
    company,
    loading,
    createCompany,
    updateCompany,
    refetchCompany: fetchCompany
  };
}