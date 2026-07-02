import type { Company } from "@/hooks/useCompany";
import type {
  AdminConfigurationSettings,
  BusinessStructureSettings,
  ApiMonitoringSettings,
  AICopilotSettings,
  TenantManagementSettings,
} from "@/types/system-settings";
import { DEFAULT_ADMIN_CONFIG } from "../systemSettingsDefaults";
import {
  getBillingPlanDefinition,
  normalizeBillingPlan,
  normalizeBillingStatus,
} from "@/services/billing/billingPlans";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  isRecord,
} from "./helpers";

const normalizeLocations = (
  value: unknown,
): BusinessStructureSettings["locations"] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (isRecord(entry) ? entry : null))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      id: asString(entry.id) ?? `loc-${Date.now()}`,
      name: asString(entry.name) ?? "Unnamed location",
      location_type: asString(entry.location_type) ?? undefined,
      temperature_controlled: entry.temperature_controlled === true,
      is_active: entry.is_active === false ? false : true,
    }));
};

const normalizeDepartments = (
  value: unknown,
): BusinessStructureSettings["departments"] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (isRecord(entry) ? entry : null))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      id: asString(entry.id) ?? `dept-${Date.now()}`,
      name: asString(entry.name) ?? "Department",
      type: asString(entry.type) ?? undefined,
      description: asString(entry.description) ?? undefined,
    }));
};

const normalizeBusinessStructure = (
  value: unknown,
  company: Company | null,
): BusinessStructureSettings => {
  const source = isRecord(value) ? value : {};
  return {
    workingHours:
      (source.workingHours as BusinessStructureSettings["workingHours"]) ??
      company?.working_hours ??
      null,
    locations: normalizeLocations(source.locations),
    departments: normalizeDepartments(source.departments),
  };
};

const normalizeApiMonitoring = (value: unknown): ApiMonitoringSettings => {
  const source = isRecord(value) ? value : {};
  const thresholds = isRecord(source.alertThresholds)
    ? source.alertThresholds
    : {};
  const recent = Array.isArray(source.recent) ? source.recent : [];

  return {
    webhookUrl: asString(source.webhookUrl),
    alertThresholds: {
      errorRate: asNumber(thresholds.errorRate, 5),
      latencyMs: asNumber(thresholds.latencyMs, 2000),
    },
    lastAlertAt: asString(source.lastAlertAt),
    recent: recent
      .map((item) => (isRecord(item) ? item : null))
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      .map((entry) => {
        const statusCandidate = asString(entry.status);
        const status: "ok" | "warning" | "error" =
          statusCandidate === "warning" || statusCandidate === "error"
            ? statusCandidate
            : "ok";
        return {
          timestamp: asString(entry.timestamp) ?? new Date().toISOString(),
          provider: asString(entry.provider) ?? "unknown",
          status,
          message: asString(entry.message) ?? undefined,
        };
      }),
  };
};

const normalizeAiCopilot = (value: unknown): AICopilotSettings => {
  const source = isRecord(value) ? value : {};
  const automationCandidate = asString(source.automationLevel);
  const automationLevel: AICopilotSettings["automationLevel"] =
    automationCandidate === "assist" || automationCandidate === "autopilot"
      ? automationCandidate
      : "suggestion";

  return {
    enabled: asBoolean(source.enabled, false),
    scopes: asStringArray(source.scopes),
    restrictedModules: asStringArray(source.restrictedModules),
    automationLevel,
    lastAuditAt: asString(source.lastAuditAt),
  };
};

const normalizeTenantManagement = (
  value: unknown,
): TenantManagementSettings => {
  const source = isRecord(value) ? value : {};
  const plan = normalizeBillingPlan(asString(source.plan));
  const planDefinition = getBillingPlanDefinition(plan);
  const legacyStatus =
    asString(source.billingStatus) ??
    asString(source.accountStatus) ??
    asString(source.subscriptionStatus);

  return {
    primaryOwnerEmail: asString(source.primaryOwnerEmail),
    activeSeats: asNumber(source.activeSeats, 0),
    maxSeats: asNumber(source.maxSeats, planDefinition.seatLimit),
    plan,
    billingStatus: normalizeBillingStatus(legacyStatus),
    billingEmail: asString(source.billingEmail),
    currentPeriodEndsAt: asString(source.currentPeriodEndsAt),
    trialEndsAt: asString(source.trialEndsAt),
  };
};

export const normalizeAdminConfig = (
  value: unknown,
  company: Company | null,
): AdminConfigurationSettings => {
  const source = isRecord(value) ? value : {};

  return {
    businessStructure: normalizeBusinessStructure(
      source.businessStructure,
      company,
    ),
    roleTemplates: Array.isArray(source.roleTemplates)
      ? source.roleTemplates
          .map((item) => (isRecord(item) ? (item as any) : null))
          .filter(Boolean)
      : DEFAULT_ADMIN_CONFIG.roleTemplates,
    apiMonitoring: normalizeApiMonitoring(source.apiMonitoring),
    aiCopilot: normalizeAiCopilot(source.aiCopilot),
    tenantManagement: normalizeTenantManagement(source.tenantManagement),
  };
};
