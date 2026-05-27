import type { TenantManagementSettings } from "@/types/system-settings";

export const BILLING_PLAN_KEYS = ["starter", "growth", "enterprise"] as const;
export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];

export const BILLING_ACCOUNT_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "disabled",
] as const;
export type BillingAccountStatus = (typeof BILLING_ACCOUNT_STATUSES)[number];

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

export const DEFAULT_BILLING_STATUS: BillingAccountStatus = "trialing";
export const DEFAULT_BILLING_PLAN: BillingPlanKey = "starter";

export function normalizeBillingPlan(value?: string | null): BillingPlanKey {
  return BILLING_PLAN_KEYS.includes(value as BillingPlanKey)
    ? (value as BillingPlanKey)
    : DEFAULT_BILLING_PLAN;
}

export function normalizeBillingStatus(
  value?: string | null,
): BillingAccountStatus {
  return BILLING_ACCOUNT_STATUSES.includes(value as BillingAccountStatus)
    ? (value as BillingAccountStatus)
    : DEFAULT_BILLING_STATUS;
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

export function resolveBillingAccountStatus(
  tenant?: Partial<TenantManagementSettings> | null,
  now = new Date(),
): BillingAccountStatus {
  const explicitStatus = normalizeBillingStatus(tenant?.accountStatus);
  if (explicitStatus === "trialing" && tenant && isTrialExpired(tenant, now)) {
    return "past_due";
  }
  return explicitStatus;
}

export function applyBillingToFeatureFlags<T extends BillingFeatureFlags>(
  baseFlags: T,
  tenant?: Partial<TenantManagementSettings> | null,
): T {
  const plan = getBillingPlanDefinition(tenant?.plan);
  const status = resolveBillingAccountStatus(tenant);

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

  if (status === "suspended" || status === "disabled") {
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

  if (status === "past_due") {
    return {
      ...planFlags,
      inventory: {
        ...planFlags.inventory,
        purchaseOrders: false,
        advancedReporting: false,
        barcodeScanning: false,
        lotTracking: false,
      },
      scheduling: {
        ...planFlags.scheduling,
        aiOptimization: false,
        timeClockIntegration: false,
      },
      reports: {
        ...planFlags.reports,
        automatedReports: false,
      },
      intelligence: {
        ...planFlags.intelligence,
        workforceFormsSync: false,
      },
    };
  }

  return planFlags;
}
