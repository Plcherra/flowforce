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
} from '@/types/system-settings';

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

export const DEFAULT_ADMIN_CONFIG: AdminConfigurationSettings = {
  businessStructure: DEFAULT_BUSINESS_STRUCTURE,
  roleTemplates: [],
  apiMonitoring: DEFAULT_API_MONITORING,
  aiCopilot: DEFAULT_AI_COPILOT,
};
