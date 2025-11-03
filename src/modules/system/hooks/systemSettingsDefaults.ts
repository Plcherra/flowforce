import type {
  GeneralSettings,
  SecuritySettings,
  LocalizationSettings,
  NotificationsSettings,
  ModuleNotificationOverride,
  IntegrationsSettings,
  AppearanceSettings,
  AdminConfigurationSettings,
  BusinessStructureSettings,
  ApiMonitoringSettings,
  AICopilotSettings,
  TenantManagementSettings,
} from '@/types/system-settings';
import type { Company } from '@/hooks/useCompany';

export const DEFAULT_GENERAL: GeneralSettings = {
  companyName: '',
  contactEmail: null,
  contactPhone: null,
  website: null,
  companyDescription: null,
  address: null,
  logoUrl: null,
};

export const DEFAULT_PASSWORD_POLICY: SecuritySettings['passwordPolicy'] = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

export const DEFAULT_SECURITY: SecuritySettings = {
  twoFactorRequired: false,
  enforceForAdmins: true,
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  sessionTimeout: 30,
  trustedDeviceWindow: 14,
  apiTokenAccess: {
    enabled: false,
    rotateEveryDays: 90,
    lastRotatedAt: null,
  },
  rowLevelSecurity: {
    enforced: true,
    allowExternalAnalytics: false,
  },
};

export const DEFAULT_LOCALIZATION: LocalizationSettings = {
  timezone: 'UTC',
  language: 'en',
  currency: 'USD',
  regionalFormats: {
    date: 'MM/DD/YYYY',
    time: 'hh:mm A',
    number: '1,234.56',
  },
};

export const DEFAULT_MODULE_OVERRIDE: ModuleNotificationOverride = {
  email: true,
  in_app: true,
  sms: false,
  push: false,
};

export const DEFAULT_NOTIFICATIONS: NotificationsSettings = {
  deliveryChannels: ['email', 'in_app'],
  digestEnabled: true,
  digestHour: 8,
  moduleOverrides: {},
  escalations: {
    criticalModules: [],
    reminderWindowMinutes: 15,
  },
};

export const DEFAULT_INTEGRATIONS: IntegrationsSettings = {
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

export const DEFAULT_APPEARANCE: AppearanceSettings = {
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

const DEFAULT_BUSINESS_STRUCTURE: BusinessStructureSettings = {
  workingHours: null,
  locations: [],
  departments: [],
};

const DEFAULT_API_MONITORING: ApiMonitoringSettings = {
  webhookUrl: null,
  alertThresholds: {
    errorRate: 5,
    latencyMs: 2000,
  },
  lastAlertAt: null,
  recent: [],
};

const DEFAULT_AI_COPILOT: AICopilotSettings = {
  enabled: false,
  scopes: [],
  restrictedModules: [],
  automationLevel: 'suggestion',
  lastAuditAt: null,
};

const DEFAULT_TENANT_MANAGEMENT: TenantManagementSettings = {
  primaryOwnerEmail: null,
  activeSeats: 0,
  maxSeats: 10,
  plan: 'starter',
  trialEndsAt: null,
};

export const DEFAULT_ADMIN_CONFIG: AdminConfigurationSettings = {
  businessStructure: DEFAULT_BUSINESS_STRUCTURE,
  roleTemplates: [],
  apiMonitoring: DEFAULT_API_MONITORING,
  aiCopilot: DEFAULT_AI_COPILOT,
  auditLogs: [],
  tenantManagement: DEFAULT_TENANT_MANAGEMENT,
};

export function seedSystemSettings(company: Company | null) {
  return {
    general: {
      ...DEFAULT_GENERAL,
      companyName: company?.name ?? DEFAULT_GENERAL.companyName,
      contactPhone: company?.phone ?? DEFAULT_GENERAL.contactPhone,
      website: company?.website ?? DEFAULT_GENERAL.website,
    },
    security: DEFAULT_SECURITY,
    localization: {
      ...DEFAULT_LOCALIZATION,
      timezone: company?.timezone ?? DEFAULT_LOCALIZATION.timezone,
      currency: company?.currency ?? DEFAULT_LOCALIZATION.currency,
    },
    notifications: DEFAULT_NOTIFICATIONS,
    integrations: DEFAULT_INTEGRATIONS,
    appearance: {
      ...DEFAULT_APPEARANCE,
      primaryColor: company?.primary_color ?? DEFAULT_APPEARANCE.primaryColor,
      secondaryColor: company?.secondary_color ?? DEFAULT_APPEARANCE.secondaryColor,
    },
    admin_config: DEFAULT_ADMIN_CONFIG,
  };
}
