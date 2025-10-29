import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany, type Company } from '@/hooks/useCompany';
import type { Tables } from '@/integrations/supabase/public-types';
import type {
  SystemSettings as SystemSettingsModel,
  GeneralSettings,
  SecuritySettings,
  LocalizationSettings,
  NotificationsSettings,
  ModuleNotificationOverride,
  IntegrationsSettings,
  IntegrationConnection,
  IntegrationStatus,
  IntegrationAuthType,
  AppearanceSettings,
  AdminConfigurationSettings,
  BusinessStructureSettings,
  ApiMonitoringSettings,
  AICopilotSettings,
} from '@/types/system-settings';
import type { AppError } from '@/utils/errorHandler';
import { handleError, showErrorToast, showSuccessToast } from '@/utils/errorHandler';

// Types derived from Supabase generated schema
 type SystemSettingsRow = Tables<'system_settings'>;
 type ProfileRow = Tables<'profiles'>;

 type SettingsKey = 'general' | 'security' | 'localization' | 'notifications' | 'integrations' | 'appearance' | 'admin';

 const DEFAULT_GENERAL: GeneralSettings = {
  companyName: '',
  contactEmail: null,
  contactPhone: null,
  website: null,
  companyDescription: null,
  address: null,
  logoUrl: null,
 };

 const DEFAULT_PASSWORD_POLICY: SecuritySettings['passwordPolicy'] = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
 };

 const DEFAULT_SECURITY: SecuritySettings = {
  twoFactorRequired: false,
  enforceForAdmins: true,
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  sessionTimeout: 30,
  trustedDeviceWindow: 14,
 };

 const DEFAULT_LOCALIZATION: LocalizationSettings = {
  timezone: 'UTC',
  language: 'en',
  currency: 'USD',
  regionalFormats: {
    date: 'MM/DD/YYYY',
    time: 'hh:mm A',
    number: '1,234.56',
  },
 };

 const DEFAULT_MODULE_OVERRIDE: ModuleNotificationOverride = {
  email: true,
  in_app: true,
  sms: false,
  push: false,
 };

 const DEFAULT_NOTIFICATIONS: NotificationsSettings = {
  deliveryChannels: ['email', 'in_app'],
  digestEnabled: true,
  digestHour: 8,
  moduleOverrides: {},
  escalations: {
    criticalModules: [],
    reminderWindowMinutes: 15,
  },
 };

const DEFAULT_INTEGRATIONS: IntegrationsSettings = {
  connections: [],
  providers: {
    toast: { status: 'disconnected', authType: 'api_key' },
    marketman: { status: 'disconnected', authType: 'api_key' },
    quickbooks: { status: 'disconnected', authType: 'oauth' },
    connecteam: { status: 'disconnected', authType: 'oauth' },
  },
  syncMappings: {
    autoSync: {
      toast: true,
      marketman: true,
      quickbooks: false,
    },
  },
  lastSyncedAt: null,
};

 const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'light',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  accentColor: '#0ea5e9',
  logoPlacement: 'sidebar',
  sidebarBranding: {
    enabled: true,
    background: 'default',
  },
  dashboardLayout: 'standard',
  preview: {
    isActive: false,
    expiresAt: null,
    snapshot: undefined,
  },
 };

 const DEFAULT_ADMIN_CONFIG: AdminConfigurationSettings = {
  businessStructure: {
    workingHours: null,
    locations: [],
    departments: [],
  },
  roleTemplates: [],
  apiMonitoring: {
    webhookUrl: null,
    alertThresholds: {
      errorRate: 5,
      latencyMs: 2000,
    },
    lastAlertAt: null,
    recent: [],
  },
  aiCopilot: {
    enabled: false,
    scopes: [],
    restrictedModules: [],
    automationLevel: 'suggestion',
    lastAuditAt: null,
  },
 };

 const INITIAL_SAVING_STATE: Record<SettingsKey, boolean> = {
  general: false,
  security: false,
  localization: false,
  notifications: false,
  integrations: false,
  appearance: false,
  admin: false,
 };

 const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const asBoolean = (value: unknown, fallback = false): boolean =>
 typeof value === 'boolean' ? value : fallback;
const asNumber = (value: unknown, fallback: number): number =>
 typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
const asStringArray = (value: unknown): string[] =>
 Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asBooleanRecord = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<Record<string, boolean>>((acc, [key, entryValue]) => {
    acc[key] = entryValue === true;
    return acc;
  }, {});
};

const randomId = () =>
 typeof crypto !== 'undefined' && 'randomUUID' in crypto
   ? crypto.randomUUID()
   : `tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const getDefaultAuthType = (provider: string): IntegrationAuthType =>
  (DEFAULT_INTEGRATIONS.providers[provider]?.authType ?? 'api_key') as IntegrationAuthType;

 const normalizeGeneral = (value: unknown, company: Company | null): GeneralSettings => {
  const source = isRecord(value) ? value : {};
  const general: GeneralSettings = {
    companyName: asString(source.companyName) ?? DEFAULT_GENERAL.companyName,
    contactEmail: asString(source.contactEmail),
    contactPhone: asString(source.contactPhone),
    website: asString(source.website),
    companyDescription: asString(source.companyDescription),
    address: asString(source.address),
    logoUrl: asString(source.logoUrl),
  };

  if (company) {
    general.companyName = company.name ?? general.companyName;
    general.companyDescription = company.description ?? general.companyDescription;
    general.website = company.website ?? general.website;
    general.contactPhone = company.phone ?? general.contactPhone;
    general.logoUrl = company.logo_url ?? general.logoUrl;
  }

  return general;
 };

 const normalizeSecurity = (value: unknown): SecuritySettings => {
  const source = isRecord(value) ? value : {};
  const policySource = isRecord(source.passwordPolicy) ? source.passwordPolicy : {};

  return {
    twoFactorRequired: asBoolean(source.twoFactorRequired, DEFAULT_SECURITY.twoFactorRequired),
    enforceForAdmins: asBoolean(source.enforceForAdmins, DEFAULT_SECURITY.enforceForAdmins),
    sessionTimeout: asNumber(source.sessionTimeout, DEFAULT_SECURITY.sessionTimeout),
    trustedDeviceWindow: asNumber(source.trustedDeviceWindow, DEFAULT_SECURITY.trustedDeviceWindow),
    passwordPolicy: {
      minLength: asNumber(policySource.minLength, DEFAULT_PASSWORD_POLICY.minLength),
      requireUppercase: asBoolean(policySource.requireUppercase, DEFAULT_PASSWORD_POLICY.requireUppercase),
      requireLowercase: asBoolean(policySource.requireLowercase, DEFAULT_PASSWORD_POLICY.requireLowercase),
      requireNumber: asBoolean(policySource.requireNumber, DEFAULT_PASSWORD_POLICY.requireNumber),
      requireSpecial: asBoolean(policySource.requireSpecial, DEFAULT_PASSWORD_POLICY.requireSpecial),
    },
  };
 };

 const normalizeLocalization = (value: unknown, company: Company | null): LocalizationSettings => {
  const source = isRecord(value) ? value : {};
  const regionalSource = isRecord(source.regionalFormats) ? source.regionalFormats : {};
  const localization: LocalizationSettings = {
    timezone: asString(source.timezone) ?? DEFAULT_LOCALIZATION.timezone,
    language: asString(source.language) ?? DEFAULT_LOCALIZATION.language,
    currency: asString(source.currency) ?? DEFAULT_LOCALIZATION.currency,
    regionalFormats: {
      date: asString(regionalSource.date) ?? DEFAULT_LOCALIZATION.regionalFormats.date,
      time: asString(regionalSource.time) ?? DEFAULT_LOCALIZATION.regionalFormats.time,
      number: asString(regionalSource.number) ?? DEFAULT_LOCALIZATION.regionalFormats.number,
    },
  };

  if (company) {
    localization.timezone = company.timezone ?? localization.timezone;
    if (company.currency) {
      localization.currency = company.currency;
    }
  }

  return localization;
 };

 const normalizeModuleOverrides = (value: unknown): Record<string, ModuleNotificationOverride> => {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce((acc, [moduleKey, moduleValue]) => {
    const overrideSource = isRecord(moduleValue) ? moduleValue : {};
    acc[moduleKey] = {
      email: asBoolean(overrideSource.email, DEFAULT_MODULE_OVERRIDE.email),
      in_app: asBoolean(overrideSource.in_app, DEFAULT_MODULE_OVERRIDE.in_app),
      sms: asBoolean(overrideSource.sms, DEFAULT_MODULE_OVERRIDE.sms),
      push: asBoolean(overrideSource.push, DEFAULT_MODULE_OVERRIDE.push),
    };
    return acc;
  }, {} as Record<string, ModuleNotificationOverride>);
 };

 const normalizeNotifications = (value: unknown): NotificationsSettings => {
  const source = isRecord(value) ? value : {};
  const escalationsSource = isRecord(source.escalations) ? source.escalations : {};

  return {
    deliveryChannels: asStringArray(source.deliveryChannels).length
      ? asStringArray(source.deliveryChannels)
      : DEFAULT_NOTIFICATIONS.deliveryChannels,
    digestEnabled: asBoolean(source.digestEnabled, DEFAULT_NOTIFICATIONS.digestEnabled),
    digestHour: asNumber(source.digestHour, DEFAULT_NOTIFICATIONS.digestHour),
    moduleOverrides: normalizeModuleOverrides(source.moduleOverrides),
    escalations: {
      criticalModules: asStringArray(escalationsSource.criticalModules),
      reminderWindowMinutes: asNumber(
        escalationsSource.reminderWindowMinutes,
        DEFAULT_NOTIFICATIONS.escalations.reminderWindowMinutes,
      ),
    },
  };
 };

 const normalizeIntegrations = (value: unknown): IntegrationsSettings => {
  const source = isRecord(value) ? value : {};
  const providersSource = isRecord(source.providers) ? source.providers : {};
  const syncMappingsSource = isRecord(source.syncMappings) ? source.syncMappings : {};
  const connectionsSource = Array.isArray(source.connections) ? source.connections : [];

  const providers: Record<string, { status: IntegrationStatus; authType: IntegrationAuthType }> = {
    ...DEFAULT_INTEGRATIONS.providers,
  };

  Object.entries(providersSource).forEach(([key, providerValue]) => {
    const providerRecord = isRecord(providerValue) ? providerValue : {};
    const statusCandidate = asString(providerRecord.status);
    const authCandidate = asString(providerRecord.authType);
    if (!providers[key]) {
      providers[key] = {
        status: 'disconnected',
        authType: 'api_key',
      };
    }
    providers[key] = {
      status: (statusCandidate as IntegrationStatus) ?? providers[key].status,
      authType: (authCandidate as IntegrationAuthType) ?? providers[key].authType,
    };
  });

  const connections: IntegrationConnection[] = connectionsSource
    .map((item) => {
      if (!isRecord(item) || typeof item.provider !== 'string') {
        return null;
      }

      const providerKey = item.provider;
      const statusCandidate = asString(item.status) as IntegrationStatus | null;
      const authCandidate = asString(item.authType) as IntegrationAuthType | null;

      return {
        id: asString(item.id) ?? randomId(),
        provider: providerKey,
        status: statusCandidate ?? providers[providerKey]?.status ?? 'disconnected',
        authType: authCandidate ?? providers[providerKey]?.authType ?? 'api_key',
        connectedAt: asString(item.connectedAt),
        lastSyncedAt: asString(item.lastSyncedAt),
        metadata: isRecord(item.metadata) ? item.metadata : undefined,
      } satisfies IntegrationConnection;
    })
    .filter((item): item is IntegrationConnection => item !== null);

  const defaultAutoSync = asBooleanRecord(
    (DEFAULT_INTEGRATIONS.syncMappings as Record<string, unknown>).autoSync,
  );
  const providedAutoSync = asBooleanRecord(syncMappingsSource.autoSync);
  const mergedAutoSync = { ...defaultAutoSync, ...providedAutoSync };

  const syncMappings: Record<string, unknown> = {
    ...DEFAULT_INTEGRATIONS.syncMappings,
    ...syncMappingsSource,
    autoSync: mergedAutoSync,
  };

  return {
    connections,
    providers,
    syncMappings,
    lastSyncedAt: asString(source.lastSyncedAt),
  };
 };

 const normalizeAppearance = (value: unknown, company: Company | null): AppearanceSettings => {
  const source = isRecord(value) ? value : {};
  const sidebarSource = isRecord(source.sidebarBranding) ? source.sidebarBranding : {};
  const previewSource = isRecord(source.preview) ? source.preview : {};

  const themeCandidate = asString(source.theme);
  const layoutCandidate = asString(source.dashboardLayout);
  const placementCandidate = asString(source.logoPlacement);
  const backgroundCandidate = asString(sidebarSource.background);

  const appearance: AppearanceSettings = {
    theme: themeCandidate === 'dark' || themeCandidate === 'system' ? (themeCandidate as AppearanceSettings['theme']) : 'light',
    primaryColor: asString(source.primaryColor) ?? DEFAULT_APPEARANCE.primaryColor,
    secondaryColor: asString(source.secondaryColor) ?? DEFAULT_APPEARANCE.secondaryColor,
    accentColor: asString(source.accentColor) ?? DEFAULT_APPEARANCE.accentColor,
    logoPlacement: placementCandidate === 'header' ? 'header' : 'sidebar',
    sidebarBranding: {
      enabled: asBoolean(sidebarSource.enabled, DEFAULT_APPEARANCE.sidebarBranding.enabled),
      background:
        backgroundCandidate === 'minimal' || backgroundCandidate === 'custom'
          ? (backgroundCandidate as AppearanceSettings['sidebarBranding']['background'])
          : DEFAULT_APPEARANCE.sidebarBranding.background,
    },
    dashboardLayout:
      layoutCandidate === 'compact' || layoutCandidate === 'analytics'
        ? (layoutCandidate as AppearanceSettings['dashboardLayout'])
        : DEFAULT_APPEARANCE.dashboardLayout,
    preview: {
      isActive: asBoolean(previewSource.isActive, DEFAULT_APPEARANCE.preview.isActive),
      expiresAt: asString(previewSource.expiresAt),
      snapshot: isRecord(previewSource.snapshot) ? previewSource.snapshot : undefined,
    },
  };

  if (company) {
    appearance.primaryColor = company.primary_color ?? appearance.primaryColor;
    appearance.secondaryColor = company.secondary_color ?? appearance.secondaryColor;
  }

  return appearance;
 };

 const normalizeBusinessStructure = (
  value: unknown,
  company: Company | null,
 ): BusinessStructureSettings => {
  const source = isRecord(value) ? value : {};
  const locationsSource = Array.isArray(source.locations) ? source.locations : [];
  const departmentsSource = Array.isArray(source.departments) ? source.departments : [];

  return {
    workingHours: (source.workingHours as BusinessStructureSettings['workingHours']) ?? company?.working_hours ?? null,
    locations: locationsSource
      .map((item) => {
        if (!isRecord(item) || typeof item.id !== 'string') return null;
        return {
          id: item.id,
          name: asString(item.name) ?? 'Unnamed Location',
          location_type: asString(item.location_type) ?? undefined,
          temperature_controlled: typeof item.temperature_controlled === 'boolean' ? item.temperature_controlled : undefined,
          is_active: typeof item.is_active === 'boolean' ? item.is_active : undefined,
        };
      })
      .filter((item): item is BusinessStructureSettings['locations'][number] => item !== null),
    departments: departmentsSource
      .map((item) => {
        if (!isRecord(item) || typeof item.id !== 'string') return null;
        return {
          id: item.id,
          name: asString(item.name) ?? 'Department',
          type: asString(item.type),
          description: asString(item.description),
        };
      })
      .filter((item): item is BusinessStructureSettings['departments'][number] => item !== null),
  };
 };

 const normalizeRoleTemplates = (value: unknown): AdminConfigurationSettings['roleTemplates'] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
        return null;
      }

      const permissions = isRecord(item.permissions) ? item.permissions : {};

      return {
        id: item.id,
        name: item.name,
        description: asString(item.description) ?? undefined,
        color: asString(item.color) ?? undefined,
        icon: asString(item.icon) ?? undefined,
        hierarchy_level: asNumber(item.hierarchy_level, 1),
        permissions,
        is_system_role: asBoolean(item.is_system_role, false),
      };
    })
    .filter((item): item is AdminConfigurationSettings['roleTemplates'][number] => item !== null);
 };

 const normalizeApiMonitoring = (value: unknown): ApiMonitoringSettings => {
  const source = isRecord(value) ? value : {};
  const thresholdsSource = isRecord(source.alertThresholds) ? source.alertThresholds : {};
  const recentSource = Array.isArray(source.recent) ? source.recent : [];

  return {
    webhookUrl: asString(source.webhookUrl),
    alertThresholds: {
      errorRate: asNumber(thresholdsSource.errorRate, DEFAULT_ADMIN_CONFIG.apiMonitoring.alertThresholds.errorRate),
      latencyMs: asNumber(thresholdsSource.latencyMs, DEFAULT_ADMIN_CONFIG.apiMonitoring.alertThresholds.latencyMs),
    },
    lastAlertAt: asString(source.lastAlertAt),
    recent: recentSource
      .map((item) => {
        if (!isRecord(item)) return null;
        const statusCandidate = asString(item.status);
        const status: 'ok' | 'warning' | 'error' = statusCandidate === 'warning' || statusCandidate === 'error' ? (statusCandidate as 'warning' | 'error') : 'ok';
        return {
          timestamp: asString(item.timestamp) ?? new Date().toISOString(),
          provider: asString(item.provider) ?? 'unknown',
          status,
          message: asString(item.message) ?? undefined,
        };
      })
      .filter((entry): entry is NonNullable<ApiMonitoringSettings['recent']>[number] => entry !== null),
  };
 };

 const normalizeAiCopilot = (value: unknown): AICopilotSettings => {
  const source = isRecord(value) ? value : {};
  const automationCandidate = asString(source.automationLevel);
  const automationLevel: AICopilotSettings['automationLevel'] =
    automationCandidate === 'assist' || automationCandidate === 'autopilot' ? (automationCandidate as AICopilotSettings['automationLevel']) : 'suggestion';

  return {
    enabled: asBoolean(source.enabled, DEFAULT_ADMIN_CONFIG.aiCopilot.enabled),
    scopes: asStringArray(source.scopes),
    restrictedModules: asStringArray(source.restrictedModules),
    automationLevel,
    lastAuditAt: asString(source.lastAuditAt),
  };
 };

 const normalizeAdminConfig = (value: unknown, company: Company | null): AdminConfigurationSettings => {
  const source = isRecord(value) ? value : {};

  return {
    businessStructure: normalizeBusinessStructure(source.businessStructure, company),
    roleTemplates: normalizeRoleTemplates(source.roleTemplates),
    apiMonitoring: normalizeApiMonitoring(source.apiMonitoring),
    aiCopilot: normalizeAiCopilot(source.aiCopilot),
  };
 };

 const normalizeSystemSettingsRow = (
  row: SystemSettingsRow,
  company: Company | null,
 ): SystemSettingsModel => ({
  id: row.id,
  companyId: row.company_id,
  general: normalizeGeneral(row.general, company),
  security: normalizeSecurity(row.security),
  localization: normalizeLocalization(row.localization, company),
  notifications: normalizeNotifications(row.notifications),
  integrations: normalizeIntegrations(row.integrations),
  appearance: normalizeAppearance(row.appearance, company),
  adminConfig: normalizeAdminConfig(row.admin_config, company),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
 });

 const allowedManagerRoles: ProfileRow['role'][] = ['admin', 'owner', 'company_admin', 'manager'];

 export function useSystemSettings() {
  const { user } = useAuth();
  const { company, loading: companyLoading, updateCompany, refetchCompany } = useCompany();

  const [settings, setSettings] = useState<SystemSettingsModel | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState<Record<SettingsKey, boolean>>(INITIAL_SAVING_STATE);
  const [error, setError] = useState<AppError | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState<ProfileRow['role'] | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);

  const ensureCanEdit = useCallback(() => {
    if (!canEdit) {
      throw new Error('You do not have permission to update system settings.');
    }
    if (!company?.id) {
      throw new Error('Company context is not available.');
    }
  }, [canEdit, company?.id]);

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!company?.id) {
        throw new Error('Company context is not available.');
      }

      const bucket = supabase.storage.from('company-assets');
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const fileName = `logo-${Date.now()}.${extension}`;
      const filePath = `${company.id}/${fileName}`;

      const { error: uploadError } = await bucket.upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = bucket.getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Unable to retrieve logo URL after upload.');
      }

      return data.publicUrl;
    },
    [company?.id],
  );

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_company_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setUserRole(data.role);
      setIsCompanyAdmin(Boolean(data.is_company_admin));
      setCanEdit(allowedManagerRoles.includes(data.role) || Boolean(data.is_company_admin));
    } catch (err) {
      const appError = handleError(err, 'loadPermissions');
      setError(appError);
      setCanEdit(false);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const fetchSettings = useCallback(async () => {
    if (!company?.id) {
      return;
    }

    setSettingsLoading(true);
    try {
      const { data: row, error: _fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      let workingRow = row ?? null;

      if (!workingRow && canEdit) {
        const { data: inserted, error: insertError } = await supabase
          .from('system_settings')
          .insert({ company_id: company.id })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        workingRow = inserted;
      }

      if (!workingRow) {
        workingRow = {
          id: `virtual-${company.id}`,
          company_id: company.id,
          general: DEFAULT_GENERAL,
          security: DEFAULT_SECURITY,
          localization: DEFAULT_LOCALIZATION,
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
        } as unknown as SystemSettingsRow;
      }

      setSettings(normalizeSystemSettingsRow(workingRow, company));
      setError(null);
    } catch (err) {
      const appError = handleError(err, 'fetchSystemSettings');
      setError(appError);
    } finally {
      setSettingsLoading(false);
    }
  }, [company, canEdit]);

  useEffect(() => {
    if (company?.id) {
      fetchSettings();
    }
  }, [company?.id, canEdit, fetchSettings]);

  const updateSettingsRow = useCallback(
    async (payload: Partial<SystemSettingsRow>) => {
      if (!company?.id) {
        throw new Error('Company context is not available.');
      }

      const { data, error: updateError } = await supabase
        .from('system_settings')
        .update(payload)
        .eq('company_id', company.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return data;
    },
    [company?.id],
  );

  const updateGeneral = useCallback(
    async (updates: Partial<GeneralSettings>, options?: { logoFile?: File }) => {
      if (!settings) return;

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateGeneralPermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, general: true }));
      try {
        let logoUrl = updates.logoUrl ?? settings.general.logoUrl;
        if (options?.logoFile) {
          logoUrl = await uploadLogo(options.logoFile);
        }

        const merged: GeneralSettings = {
          ...settings.general,
          ...updates,
          logoUrl,
        };

        if (!merged.companyName.trim()) {
          throw new Error('Company name is required.');
        }

        const updatedCompany = await updateCompany({
          name: merged.companyName,
          description: merged.companyDescription ?? undefined,
          website: merged.website ?? undefined,
          phone: merged.contactPhone ?? undefined,
          logo_url: merged.logoUrl ?? undefined,
        });

        const updatedRow = await updateSettingsRow({ general: merged });
        const normalized = normalizeSystemSettingsRow(updatedRow, updatedCompany ?? company ?? null);
        setSettings(normalized);
        showSuccessToast('General settings updated');
      } catch (err) {
        const appError = handleError(err, 'updateGeneral');
        setError(appError);
        showErrorToast(err, 'updateGeneral');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, general: false }));
      }
    },
    [settings, ensureCanEdit, uploadLogo, updateCompany, updateSettingsRow, company],
  );

  const updateSecurity = useCallback(
    async (updates: Partial<SecuritySettings>) => {
      if (!settings) return;

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateSecurityPermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, security: true }));
      try {
        const merged: SecuritySettings = {
          ...settings.security,
          ...updates,
          passwordPolicy: {
            ...settings.security.passwordPolicy,
            ...(updates.passwordPolicy ?? {}),
          },
        };

        const updatedRow = await updateSettingsRow({ security: merged });
        setSettings(normalizeSystemSettingsRow(updatedRow, company));
        showSuccessToast('Security settings updated');
      } catch (err) {
        const appError = handleError(err, 'updateSecurity');
        setError(appError);
        showErrorToast(err, 'updateSecurity');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, security: false }));
      }
    },
    [settings, ensureCanEdit, updateSettingsRow, company],
  );

  const updateLocalization = useCallback(
    async (updates: Partial<LocalizationSettings>) => {
      if (!settings) return;

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateLocalizationPermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, localization: true }));
      try {
        const merged: LocalizationSettings = {
          ...settings.localization,
          ...updates,
          regionalFormats: {
            ...settings.localization.regionalFormats,
            ...(updates.regionalFormats ?? {}),
          },
        };

        const updatedCompany = await updateCompany({
          timezone: merged.timezone,
          currency: merged.currency,
        });

        const updatedRow = await updateSettingsRow({ localization: merged });
        const normalized = normalizeSystemSettingsRow(updatedRow, updatedCompany ?? company);
        setSettings(normalized);
        showSuccessToast('Localization settings updated');
      } catch (err) {
        const appError = handleError(err, 'updateLocalization');
        setError(appError);
        showErrorToast(err, 'updateLocalization');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, localization: false }));
      }
    },
    [settings, ensureCanEdit, updateCompany, updateSettingsRow, company],
  );

  const updateNotifications = useCallback(
    async (updates: Partial<NotificationsSettings>) => {
      if (!settings) return;

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateNotificationsPermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, notifications: true }));
      try {
        const mergedOverrides = { ...settings.notifications.moduleOverrides };
        if (updates.moduleOverrides) {
          Object.entries(updates.moduleOverrides).forEach(([moduleKey, override]) => {
            mergedOverrides[moduleKey] = {
              ...DEFAULT_MODULE_OVERRIDE,
              ...(settings.notifications.moduleOverrides[moduleKey] ?? {}),
              ...override,
            };
          });
        }

        const merged: NotificationsSettings = {
          ...settings.notifications,
          ...updates,
          deliveryChannels: updates.deliveryChannels ?? settings.notifications.deliveryChannels,
          moduleOverrides: mergedOverrides,
          escalations: {
            ...settings.notifications.escalations,
            ...(updates.escalations ?? {}),
          },
        };

        const updatedRow = await updateSettingsRow({ notifications: merged });
        setSettings(normalizeSystemSettingsRow(updatedRow, company));
        showSuccessToast('Notification settings updated');
      } catch (err) {
        const appError = handleError(err, 'updateNotifications');
        setError(appError);
        showErrorToast(err, 'updateNotifications');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, notifications: false }));
      }
    },
    [settings, ensureCanEdit, updateSettingsRow, company],
  );

  const updateIntegrations = useCallback(
    async (updates: Partial<IntegrationsSettings>) => {
      if (!settings) return;

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateIntegrationsPermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, integrations: true }));
      try {
        const mergedProviders = { ...settings.integrations.providers };
        if (updates.providers) {
          Object.entries(updates.providers).forEach(([providerKey, providerValue]) => {
            mergedProviders[providerKey] = {
              status: providerValue.status,
              authType: providerValue.authType,
            };
          });
        }

        const connectionMap = new Map<string, IntegrationConnection>();
        settings.integrations.connections.forEach((connection) => {
          connectionMap.set(connection.id, connection);
        });

        if (updates.connections) {
          updates.connections.forEach((connection) => {
            connectionMap.set(connection.id, connection);
          });
        }

        const merged: IntegrationsSettings = {
          ...settings.integrations,
          ...updates,
          providers: mergedProviders,
          connections: Array.from(connectionMap.values()),
          syncMappings: {
            ...settings.integrations.syncMappings,
            ...(updates.syncMappings ?? {}),
          },
          lastSyncedAt: updates.lastSyncedAt ?? settings.integrations.lastSyncedAt,
        };

        const updatedRow = await updateSettingsRow({ integrations: merged });
        setSettings(normalizeSystemSettingsRow(updatedRow, company));
        showSuccessToast('Integration settings updated');
      } catch (err) {
        const appError = handleError(err, 'updateIntegrations');
        setError(appError);
        showErrorToast(err, 'updateIntegrations');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, integrations: false }));
      }
    },
    [settings, ensureCanEdit, updateSettingsRow, company],
  );

  const connectIntegration = useCallback(
    async (provider: string, connection: IntegrationConnection) => {
      return updateIntegrations({
        providers: {
          [provider]: {
            status: connection.status,
            authType: connection.authType,
          },
        },
        connections: [connection],
        lastSyncedAt: connection.lastSyncedAt ?? new Date().toISOString(),
      });
    },
    [updateIntegrations],
  );

  const disconnectIntegration = useCallback(
    async (provider: string) => {
      if (!settings) return;
      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'disconnectIntegrationPermissions');
        throw permissionError;
      }

      const remainingConnections = settings.integrations.connections.filter(
        (connection) => connection.provider !== provider,
      );

      return updateIntegrations({
        providers: {
          [provider]: {
            status: 'disconnected',
            authType:
              settings.integrations.providers[provider]?.authType ?? getDefaultAuthType(provider),
          },
        },
        connections: remainingConnections,
      });
    },
    [settings, ensureCanEdit, updateIntegrations],
  );

  const updateAppearance = useCallback(
    async (updates: Partial<AppearanceSettings>, options?: { previewOnly?: boolean }) => {
      if (!settings) return;

      const merged: AppearanceSettings = {
        ...settings.appearance,
        ...updates,
        sidebarBranding: {
          ...settings.appearance.sidebarBranding,
          ...(updates.sidebarBranding ?? {}),
        },
        preview: {
          ...settings.appearance.preview,
          ...(updates.preview ?? {}),
        },
      };

      if (options?.previewOnly) {
        setSettings((prev) => (prev ? { ...prev, appearance: merged } : prev));
        return;
      }

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateAppearancePermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, appearance: true }));
      try {
        const updatedCompany = await updateCompany({
          primary_color: merged.primaryColor,
          secondary_color: merged.secondaryColor,
        });

        const updatedRow = await updateSettingsRow({ appearance: merged });
        const normalized = normalizeSystemSettingsRow(updatedRow, updatedCompany ?? company);
        setSettings(normalized);
        showSuccessToast('Appearance settings updated');
      } catch (err) {
        const appError = handleError(err, 'updateAppearance');
        setError(appError);
        showErrorToast(err, 'updateAppearance');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, appearance: false }));
      }
    },
    [settings, ensureCanEdit, updateCompany, updateSettingsRow, company],
  );

  const updateAdminConfig = useCallback(
    async (updates: Partial<AdminConfigurationSettings>) => {
      if (!settings) return;

      try {
        ensureCanEdit();
      } catch (permissionError) {
        showErrorToast(permissionError, 'updateAdminConfigPermissions');
        throw permissionError;
      }

      setSaving((prev) => ({ ...prev, admin: true }));
      try {
        const merged: AdminConfigurationSettings = {
          businessStructure: {
            ...settings.adminConfig.businessStructure,
            ...(updates.businessStructure ?? {}),
          },
          roleTemplates: updates.roleTemplates ?? settings.adminConfig.roleTemplates,
          apiMonitoring: {
            ...settings.adminConfig.apiMonitoring,
            ...(updates.apiMonitoring ?? {}),
            alertThresholds: {
              ...settings.adminConfig.apiMonitoring.alertThresholds,
              ...(updates.apiMonitoring?.alertThresholds ?? {}),
            },
          },
          aiCopilot: {
            ...settings.adminConfig.aiCopilot,
            ...(updates.aiCopilot ?? {}),
          },
        };

        const updatedRow = await updateSettingsRow({ admin_config: merged });
        setSettings(normalizeSystemSettingsRow(updatedRow, company));
        showSuccessToast('Admin configuration updated');
      } catch (err) {
        const appError = handleError(err, 'updateAdminConfig');
        setError(appError);
        showErrorToast(err, 'updateAdminConfig');
        throw err;
      } finally {
        setSaving((prev) => ({ ...prev, admin: false }));
      }
    },
    [settings, ensureCanEdit, updateSettingsRow, company],
  );

  const setAppearancePreview = useCallback(
    (preview: AppearanceSettings['preview']) => {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              appearance: {
                ...prev.appearance,
                preview,
              },
            }
          : prev,
      );
    },
    [],
  );

  const syncAdminConfigSnapshot = useCallback(async () => {
    if (!settings || !company?.id) return;
    try {
      ensureCanEdit();
    } catch (permissionError) {
      showErrorToast(permissionError, 'syncAdminConfigPermissions');
      throw permissionError;
    }

    setSaving((prev) => ({ ...prev, admin: true }));
    try {
      const [companyResult, locationsResult, rolesResult] = await Promise.all([
        supabase
          .from('companies')
          .select('working_hours')
          .eq('id', company.id)
          .single(),
        supabase
          .from('inv_locations')
          .select('id, name, location_type, temperature_controlled, is_active')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('company_roles')
          .select('id, name, description, color, icon, hierarchy_level, permissions, is_system_role, is_active')
          .eq('company_id', company.id),
      ]);

      const workingHours =
        (companyResult.data?.working_hours as BusinessStructureSettings['workingHours']) ??
        settings.adminConfig.businessStructure.workingHours;

      const locationsSnapshot =
        locationsResult.data?.map((item) => ({
          id: item.id,
          name: item.name,
          location_type: item.location_type,
          temperature_controlled: item.temperature_controlled,
          is_active: item.is_active,
        })) ?? settings.adminConfig.businessStructure.locations;

      const roleTemplatesSnapshot =
        rolesResult.data?.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description ?? undefined,
          color: role.color ?? '#6b7280',
          icon: role.icon ?? 'Users',
          hierarchy_level: role.hierarchy_level ?? 1,
          permissions:
            typeof role.permissions === 'object'
              ? (role.permissions as Record<string, boolean>)
              : asBooleanRecord(role.permissions),
          is_system_role: Boolean(role.is_system_role),
        })) ?? settings.adminConfig.roleTemplates;

      const updatedRow = await updateSettingsRow({
        admin_config: {
          ...settings.adminConfig,
          businessStructure: {
            ...settings.adminConfig.businessStructure,
            workingHours,
            locations: locationsSnapshot,
          },
          roleTemplates: roleTemplatesSnapshot,
        },
      });
      setSettings(normalizeSystemSettingsRow(updatedRow, company));
      showSuccessToast('Admin configuration snapshot refreshed');
    } catch (err) {
      const appError = handleError(err, 'syncAdminConfigSnapshot');
      setError(appError);
      showErrorToast(err, 'syncAdminConfigSnapshot');
      throw err;
    } finally {
      setSaving((prev) => ({ ...prev, admin: false }));
    }
  }, [settings, company, ensureCanEdit, updateSettingsRow]);

  const refresh = useCallback(async () => {
    await Promise.all([refetchCompany(), fetchSettings()]);
  }, [refetchCompany, fetchSettings]);

  const loading = useMemo(
    () => companyLoading || profileLoading || settingsLoading,
    [companyLoading, profileLoading, settingsLoading],
  );

  return {
    settings,
    company,
    loading,
    saving,
    error,
    canEdit,
    role: userRole,
    isCompanyAdmin,
    refresh,
    updateGeneral,
    updateSecurity,
    updateLocalization,
    updateNotifications,
    updateIntegrations,
    connectIntegration,
    disconnectIntegration,
    updateAppearance,
    setAppearancePreview,
    updateAdminConfig,
    syncAdminConfigSnapshot,
  };
}
