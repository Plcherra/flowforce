import type { TenantManagementSettings } from "@/types/system-settings";

export const BILLING_PLAN_KEYS = ["starter", "growth", "enterprise"] as const;
export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];

export const BILLING_STATUSES = ["trial", "active", "deactivated"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

// TODO(2026-08): Remove deprecated aliases after one release cycle post Phase 1 billing.
/** @deprecated Use BILLING_STATUSES */
export const BILLING_ACCOUNT_STATUSES = BILLING_STATUSES;
/** @deprecated Use BillingStatus */
export type BillingAccountStatus = BillingStatus;

export type BillingPlanDefinition = {
  key: BillingPlanKey;
  label: string;
  seatLimit: number;
  description: string;
  featureFlags: {
    inventory: {
      cookbook: boolean;
      prepPar: boolean;
      wasteTracking: boolean;
      purchaseOrders: boolean;
      advancedReporting: boolean;
      barcodeScanning: boolean;
      lotTracking: boolean;
    };
    scheduling: {
      aiOptimization: boolean;
      shiftSwapping: boolean;
      timeClockIntegration: boolean;
    };
    reports: {
      customReports: boolean;
      dataExport: boolean;
      automatedReports: boolean;
    };
    operations: {
      engagementMetrics: boolean;
    };
    intelligence: {
      oodaLoop: boolean;
      workforceFormsSync: boolean;
    };
  };
};

export type BillingFeatureFlags = BillingPlanDefinition["featureFlags"] & {
  admin: {
    companyRoles: boolean;
    permissionOverrides: boolean;
    auditLogs: boolean;
  };
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    key: "starter",
    label: "Starter",
    seatLimit: 10,
    description: "Core team operations for a small pilot workspace.",
    featureFlags: {
      inventory: {
        cookbook: false,
        prepPar: true,
        wasteTracking: true,
        purchaseOrders: false,
        advancedReporting: false,
        barcodeScanning: false,
        lotTracking: false,
      },
      scheduling: {
        aiOptimization: false,
        shiftSwapping: true,
        timeClockIntegration: false,
      },
      reports: {
        customReports: false,
        dataExport: true,
        automatedReports: false,
      },
      operations: {
        engagementMetrics: false,
      },
      intelligence: {
        oodaLoop: false,
        workforceFormsSync: false,
      },
    },
  },
  {
    key: "growth",
    label: "Growth",
    seatLimit: 50,
    description: "Multi-manager operations with purchasing and richer reports.",
    featureFlags: {
      inventory: {
        cookbook: true,
        prepPar: true,
        wasteTracking: true,
        purchaseOrders: true,
        advancedReporting: false,
        barcodeScanning: false,
        lotTracking: false,
      },
      scheduling: {
        aiOptimization: false,
        shiftSwapping: true,
        timeClockIntegration: false,
      },
      reports: {
        customReports: true,
        dataExport: true,
        automatedReports: false,
      },
      operations: {
        engagementMetrics: true,
      },
      intelligence: {
        oodaLoop: true,
        workforceFormsSync: false,
      },
    },
  },
  {
    key: "enterprise",
    label: "Enterprise",
    seatLimit: 250,
    description: "Advanced controls for larger operators and integrations.",
    featureFlags: {
      inventory: {
        cookbook: true,
        prepPar: true,
        wasteTracking: true,
        purchaseOrders: true,
        advancedReporting: true,
        barcodeScanning: true,
        lotTracking: true,
      },
      scheduling: {
        aiOptimization: true,
        shiftSwapping: true,
        timeClockIntegration: true,
      },
      reports: {
        customReports: true,
        dataExport: true,
        automatedReports: true,
      },
      operations: {
        engagementMetrics: true,
      },
      intelligence: {
        oodaLoop: true,
        workforceFormsSync: true,
      },
    },
  },
];

export const DEFAULT_BILLING_STATUS: BillingStatus = "trial";
export const DEFAULT_BILLING_PLAN: BillingPlanKey = "starter";

const LEGACY_ACTIVE_STATUSES = new Set(["active"]);
const LEGACY_TRIAL_STATUSES = new Set(["trial", "trialing"]);

export function mapLegacyBillingStatus(value?: string | null): BillingStatus {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_BILLING_STATUS;
  if (BILLING_STATUSES.includes(normalized as BillingStatus)) {
    return normalized as BillingStatus;
  }
  if (LEGACY_TRIAL_STATUSES.has(normalized)) return "trial";
  if (LEGACY_ACTIVE_STATUSES.has(normalized)) return "active";
  return "deactivated";
}

export function normalizeBillingPlan(value?: string | null): BillingPlanKey {
  return BILLING_PLAN_KEYS.includes(value as BillingPlanKey)
    ? (value as BillingPlanKey)
    : DEFAULT_BILLING_PLAN;
}

export function normalizeBillingStatus(value?: string | null): BillingStatus {
  return mapLegacyBillingStatus(value);
}

export function getBillingStatusLabel(status: BillingStatus): string {
  switch (status) {
    case "trial":
      return "Trial";
    case "active":
      return "Active";
    case "deactivated":
      return "Deactivated";
    default:
      return status;
  }
}

export function getBillingPlanDefinition(plan?: string | null) {
  const normalizedPlan = normalizeBillingPlan(plan);
  return (
    BILLING_PLANS.find((definition) => definition.key === normalizedPlan) ??
    BILLING_PLANS[0]
  );
}

export function isTrialExpired(
  tenant: Pick<TenantManagementSettings, "trialEndsAt">,
  now = new Date(),
) {
  if (!tenant.trialEndsAt) return false;
  const trialEnd = new Date(tenant.trialEndsAt);
  return (
    Number.isFinite(trialEnd.getTime()) && trialEnd.getTime() < now.getTime()
  );
}

export function resolveBillingStatus(
  tenant?: Partial<TenantManagementSettings> | null,
  now = new Date(),
): BillingStatus {
  const explicitStatus = normalizeBillingStatus(tenant?.billingStatus);
  if (explicitStatus === "trial" && tenant && isTrialExpired(tenant, now)) {
    return "deactivated";
  }
  return explicitStatus;
}

// TODO(2026-08): Remove deprecated alias after one release cycle post Phase 1 billing.
/** @deprecated Use resolveBillingStatus */
export const resolveBillingAccountStatus = resolveBillingStatus;

export function applyBillingToFeatureFlags<T extends BillingFeatureFlags>(
  baseFlags: T,
  tenant?: Partial<TenantManagementSettings> | null,
): T {
  const plan = getBillingPlanDefinition(tenant?.plan);
  const status = resolveBillingStatus(tenant);

  const planFlags: T = {
    ...baseFlags,
    inventory: {
      ...baseFlags.inventory,
      ...plan.featureFlags.inventory,
    },
    scheduling: {
      ...baseFlags.scheduling,
      ...plan.featureFlags.scheduling,
    },
    reports: {
      ...baseFlags.reports,
      ...plan.featureFlags.reports,
    },
    operations: {
      ...baseFlags.operations,
      ...plan.featureFlags.operations,
    },
    intelligence: {
      ...baseFlags.intelligence,
      ...plan.featureFlags.intelligence,
    },
    admin: {
      ...baseFlags.admin,
      auditLogs: true,
    },
  };

  if (status === "deactivated") {
    return {
      ...planFlags,
      inventory: {
        ...planFlags.inventory,
        cookbook: false,
        prepPar: false,
        wasteTracking: false,
        purchaseOrders: false,
        advancedReporting: false,
        barcodeScanning: false,
        lotTracking: false,
      },
      scheduling: {
        ...planFlags.scheduling,
        aiOptimization: false,
        shiftSwapping: false,
        timeClockIntegration: false,
      },
      reports: {
        ...planFlags.reports,
        customReports: false,
        dataExport: false,
        automatedReports: false,
      },
      operations: {
        engagementMetrics: false,
      },
      intelligence: {
        oodaLoop: false,
        workforceFormsSync: false,
      },
      admin: {
        ...planFlags.admin,
        permissionOverrides: false,
        auditLogs: true,
      },
    };
  }

  return planFlags;
}
