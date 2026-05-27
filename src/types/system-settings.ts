import type { CompanyRole, CompanySettings } from "@/types/common";

export interface GeneralSettings {
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  companyDescription: string | null;
  address?: string | null;
  logoUrl: string | null;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface TokenAccessSettings {
  enabled: boolean;
  rotateEveryDays: number;
  lastRotatedAt?: string | null;
}

export interface RowLevelSecuritySettings {
  enforced: boolean;
  allowExternalAnalytics: boolean;
}

export interface SecuritySettings {
  twoFactorRequired: boolean;
  enforceForAdmins: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  trustedDeviceWindow: number;
  apiTokenAccess: TokenAccessSettings;
  rowLevelSecurity: RowLevelSecuritySettings;
}

export interface LocalizationSettings {
  timezone: string;
  language: string;
  currency: string;
  regionalFormats: {
    date: string;
    time: string;
    number: string;
  };
}

export interface ModuleNotificationOverride {
  email: boolean;
  in_app: boolean;
  sms: boolean;
  push?: boolean;
}

export interface NotificationsSettings {
  deliveryChannels: string[];
  digestEnabled: boolean;
  digestHour: number;
  moduleOverrides: Record<string, ModuleNotificationOverride>;
  escalations: {
    criticalModules: string[];
    reminderWindowMinutes: number;
  };
}

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending";
export type IntegrationAuthType = "api_key" | "oauth" | "webhook";

export interface IntegrationConnection {
  id: string;
  provider: string;
  status: IntegrationStatus;
  authType: IntegrationAuthType;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IntegrationsSettings {
  connections: IntegrationConnection[];
  providers: Record<
    string,
    { status: IntegrationStatus; authType: IntegrationAuthType }
  >;
  syncMappings: Record<string, unknown>;
  lastSyncedAt?: string | null;
}

export type ThemeMode = "light" | "dark" | "system";
export type LogoPlacement = "sidebar" | "header";
export type DashboardLayout = "standard" | "compact" | "analytics";

export interface AppearanceSettings {
  theme: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoPlacement: LogoPlacement;
  sidebarBranding: {
    enabled: boolean;
    background: "default" | "minimal" | "custom";
  };
  dashboardLayout: DashboardLayout;
  preview: {
    isActive: boolean;
    expiresAt: string | null;
    snapshot?: Record<string, unknown>;
  };
}

export interface BusinessStructureSettings {
  workingHours: CompanySettings["working_hours"] | null;
  locations: Array<{
    id: string;
    name: string;
    location_type?: string;
    temperature_controlled?: boolean | null;
    is_active?: boolean | null;
  }>;
  departments: Array<{
    id: string;
    name: string;
    type?: string | null;
    description?: string | null;
  }>;
}

export interface ApiMonitoringSettings {
  webhookUrl: string | null;
  alertThresholds: {
    errorRate: number;
    latencyMs: number;
  };
  lastAlertAt: string | null;
  recent?: Array<{
    timestamp: string;
    provider: string;
    status: "ok" | "warning" | "error";
    message?: string;
  }>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface TenantManagementSettings {
  primaryOwnerEmail: string | null;
  activeSeats: number;
  maxSeats: number;
  plan: string;
  accountStatus: "trialing" | "active" | "past_due" | "suspended" | "disabled";
  subscriptionStatus:
    | "none"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  billingEmail?: string | null;
  currentPeriodEndsAt?: string | null;
  trialEndsAt?: string | null;
}

export type AutomationScopeLevel = "suggestion" | "assist" | "autopilot";

export interface AICopilotSettings {
  enabled: boolean;
  scopes: string[];
  restrictedModules: string[];
  automationLevel?: AutomationScopeLevel;
  lastAuditAt?: string | null;
}

export interface AdminConfigurationSettings {
  businessStructure: BusinessStructureSettings;
  roleTemplates: CompanyRole[];
  apiMonitoring: ApiMonitoringSettings;
  aiCopilot: AICopilotSettings;
  auditLogs?: AuditLogEntry[];
  tenantManagement?: TenantManagementSettings;
}

export interface SystemSettings {
  id: string;
  companyId: string;
  general: GeneralSettings;
  security: SecuritySettings;
  localization: LocalizationSettings;
  notifications: NotificationsSettings;
  integrations: IntegrationsSettings;
  appearance: AppearanceSettings;
  adminConfig: AdminConfigurationSettings;
  createdAt: string;
  updatedAt: string;
}
