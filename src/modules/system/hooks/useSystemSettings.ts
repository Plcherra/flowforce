import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany, type Company } from '@/hooks/useCompany';
import type { Tables } from '@/integrations/supabase/public-types';
import type { SystemSettings as SystemSettingsModel } from '@/types/system-settings';
import { handleError } from '@/utils/errorHandler';
import {
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_APPEARANCE,
  DEFAULT_GENERAL,
  DEFAULT_INTEGRATIONS,
  DEFAULT_LOCALIZATION,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SECURITY,
} from './systemSettingsDefaults';
import { normalizeSystemSettingsRow, type SystemSettingsRow } from './systemSettingsNormalizer';

type ProfileRow = Tables<'profiles'>;

type PartialUpdate = Partial<
  Pick<
    SystemSettingsRow,
    | 'general'
    | 'security'
    | 'localization'
    | 'notifications'
    | 'integrations'
    | 'appearance'
    | 'admin_config'
    | 'updated_at'
  >
>;

const allowedManagerRoles: ProfileRow['role'][] = ['admin', 'owner', 'company_admin', 'manager'];

const ensureDefaults = (company: Company, companyId: string): SystemSettingsRow => ({
  id: `virtual-${companyId}`,
  company_id: companyId,
  general: {
    ...DEFAULT_GENERAL,
    companyName: company.name ?? DEFAULT_GENERAL.companyName,
    companyDescription: company.description ?? DEFAULT_GENERAL.companyDescription,
    website: company.website ?? DEFAULT_GENERAL.website,
    contactPhone: company.phone ?? DEFAULT_GENERAL.contactPhone,
    logoUrl: company.logo_url ?? DEFAULT_GENERAL.logoUrl,
  },
  security: DEFAULT_SECURITY,
  localization: {
    ...DEFAULT_LOCALIZATION,
    timezone: company.timezone ?? DEFAULT_LOCALIZATION.timezone,
    currency: company.currency ?? DEFAULT_LOCALIZATION.currency,
  },
  notifications: DEFAULT_NOTIFICATIONS,
  integrations: DEFAULT_INTEGRATIONS,
  appearance: {
    ...DEFAULT_APPEARANCE,
    primaryColor: company.primary_color ?? DEFAULT_APPEARANCE.primaryColor,
    secondaryColor: company.secondary_color ?? DEFAULT_APPEARANCE.secondaryColor,
  },
  admin_config: {
    ...DEFAULT_ADMIN_CONFIG,
    businessStructure: {
      ...DEFAULT_ADMIN_CONFIG.businessStructure,
      workingHours: company.working_hours ?? DEFAULT_ADMIN_CONFIG.businessStructure.workingHours,
    },
  },
  created_at: company.created_at ?? new Date().toISOString(),
  updated_at: company.updated_at ?? new Date().toISOString(),
});

export interface SystemSettingsHook {
  company: Company | null;
  settings: SystemSettingsModel | null;
  loading: boolean;
  error: Error | null;
  canEdit: boolean;
  role: ProfileRow['role'] | null;
  isCompanyAdmin: boolean;
  refresh: () => Promise<void>;
  updateSettings: (changes: PartialUpdate) => Promise<SystemSettingsModel | null>;
}

export function useSystemSettings(providedCompanyId?: string): SystemSettingsHook {
  const { user } = useAuth();
  const { company, loading: companyLoading, refetchCompany } = useCompany();

  const companyId = providedCompanyId ?? company?.id ?? null;

  const [settings, setSettings] = useState<SystemSettingsModel | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [role, setRole] = useState<ProfileRow['role'] | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  const canEdit = useMemo(
    () => (role ? allowedManagerRoles.includes(role) : false) || isCompanyAdmin,
    [role, isCompanyAdmin],
  );

  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsCompanyAdmin(false);
      setPermissionsReady(true);
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_company_admin')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        if (!active) return;

        setRole(data.role);
        setIsCompanyAdmin(Boolean(data.is_company_admin));
      } catch (err) {
        if (!active) return;
        const handled = handleError(err, 'loadSystemSettingsPermissions');
        setError(new Error(handled.message));
        setRole(null);
        setIsCompanyAdmin(false);
      } finally {
        if (active) {
          setPermissionsReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!companyId) {
      setSettings(null);
      setError(new Error('No active company context'));
      return;
    }

    setFetching(true);
    try {
      const { data: row, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      let workingRow = row ?? null;

      if (!workingRow && canEdit) {
        const { data: inserted, error: insertError } = await supabase
          .from('system_settings')
          .insert({ company_id: companyId })
          .select()
          .single();

        if (insertError) throw insertError;
        workingRow = inserted;
      }

      if (!workingRow && company) {
        workingRow = ensureDefaults(company, companyId);
      }

      if (workingRow) {
        setSettings(normalizeSystemSettingsRow(workingRow, company ?? null));
        setError(null);
      } else {
        setSettings(null);
        setError(new Error('Unable to resolve system settings'));
      }
    } catch (err) {
      const handled = handleError(err, 'fetchSystemSettings');
      setError(new Error(handled.message));
      setSettings(null);
    } finally {
      setFetching(false);
    }
  }, [companyId, canEdit, company]);

  useEffect(() => {
    if (!permissionsReady || (companyLoading && !companyId)) {
      return;
    }
    void fetchSettings();
  }, [permissionsReady, companyId, fetchSettings, companyLoading]);

  const updateSettings = useCallback(
    async (changes: PartialUpdate) => {
      if (!companyId) {
        throw new Error('Company context is required to update settings');
      }

      const payload: PartialUpdate = {
        ...changes,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('system_settings')
        .update(payload)
        .eq('company_id', companyId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const normalized = normalizeSystemSettingsRow(
        data as SystemSettingsRow,
        company ?? null,
      );

      setSettings(normalized);
      return normalized;
    },
    [companyId, company],
  );

  const refresh = useCallback(async () => {
    await Promise.all([refetchCompany(), fetchSettings()]);
  }, [fetchSettings, refetchCompany]);

  const loading = companyLoading || fetching || !permissionsReady;

  return {
    company: company ?? null,
    settings,
    loading,
    error,
    canEdit,
    role,
    isCompanyAdmin,
    refresh,
    updateSettings,
  };
}
