import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBillingPlanDefinition,
  normalizeBillingPlan,
  type BillingPlanKey,
  type BillingStatus,
} from "@/services/billing/billingPlans";
import {
  AUDIT_ACTIONS,
  getAuditEventMetadata,
} from "@/services/audit/auditEvents";
import { planKeyFromStripeSubscription } from "./stripePrices";
import {
  getPaymentGraceEndsAt,
  resolveBillingStatusAfterPaymentFailure,
} from "./billingGracePeriod";

type TenantManagementJson = {
  billingStatus?: string | null;
  plan?: string | null;
  billingEmail?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  cancelAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  paymentFailedAt?: string | null;
  maxSeats?: number | null;
  activeSeats?: number | null;
  primaryOwnerEmail?: string | null;
  [key: string]: unknown;
};

type AdminConfigJson = {
  tenantManagement?: TenantManagementJson | null;
  [key: string]: unknown;
};

export type StripeBillingSyncInput = {
  companyId: string;
  customerId?: string | null;
  subscription?: Stripe.Subscription | null;
  planOverride?: BillingPlanKey | null;
  billingStatusOverride?: BillingStatus | null;
  recordPaymentFailure?: boolean;
  clearPaymentFailure?: boolean;
  auditAction?: string;
  auditMetadata?: Record<string, unknown>;
  actorId?: string | null;
};

const toIso = (unixSeconds: number | null | undefined) => {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
};

const readSubscriptionPeriodEnd = (
  subscription: Stripe.Subscription | null | undefined,
) => {
  if (!subscription) return null;
  const itemPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
  if (itemPeriodEnd) return itemPeriodEnd;
  const legacyPeriodEnd = (
    subscription as Stripe.Subscription & { current_period_end?: number }
  ).current_period_end;
  return legacyPeriodEnd ?? null;
};

export function resolveBillingStatusFromSubscription(
  subscription: Stripe.Subscription | null | undefined,
): BillingStatus {
  if (!subscription) return "deactivated";

  switch (subscription.status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "deactivated";
    default:
      return "deactivated";
  }
}

function resolveTrialEndsAt(params: {
  billingStatus: BillingStatus;
  subscription: Stripe.Subscription | null;
  tenant: TenantManagementJson;
}) {
  const { billingStatus, subscription, tenant } = params;
  const subscriptionStatus = subscription?.status;

  if (billingStatus === "active" && subscriptionStatus !== "trialing") {
    return null;
  }

  if (subscriptionStatus === "trialing") {
    return toIso(subscription?.trial_end) ?? tenant.trialEndsAt ?? null;
  }

  return toIso(subscription?.trial_end) ?? tenant.trialEndsAt ?? null;
}

function resolveEffectiveBillingStatus(params: {
  subscription: Stripe.Subscription | null;
  tenant: TenantManagementJson;
  paymentFailedAt: string | null;
  billingStatusOverride?: BillingStatus | null;
  now: Date;
}): BillingStatus {
  const { subscription, tenant, paymentFailedAt, billingStatusOverride, now } =
    params;

  if (billingStatusOverride) {
    return billingStatusOverride;
  }

  const subscriptionStatus = subscription?.status ?? null;
  const baseStatus = resolveBillingStatusFromSubscription(subscription);

  if (
    paymentFailedAt &&
    (subscriptionStatus === "past_due" ||
      subscriptionStatus === "unpaid" ||
      tenant.billingStatus === "active")
  ) {
    return resolveBillingStatusAfterPaymentFailure(
      paymentFailedAt,
      subscriptionStatus,
      now,
    );
  }

  return baseStatus;
}

export async function syncStripeBilling(
  client: SupabaseClient,
  input: StripeBillingSyncInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const subscription = input.subscription ?? null;

  const { data: settingsRow, error: settingsError } = await client
    .from("system_settings")
    .select("admin_config")
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (settingsError) {
    return { ok: false, message: settingsError.message };
  }

  const adminConfig = (settingsRow?.admin_config ?? {}) as AdminConfigJson;
  const tenant = adminConfig.tenantManagement ?? {};

  let paymentFailedAt = tenant.paymentFailedAt ?? null;
  if (input.clearPaymentFailure) {
    paymentFailedAt = null;
  } else if (input.recordPaymentFailure) {
    paymentFailedAt = paymentFailedAt ?? now;
  }

  const plan =
    input.planOverride ??
    planKeyFromStripeSubscription(subscription) ??
    normalizeBillingPlan(null);
  const planDefinition = getBillingPlanDefinition(plan);

  let billingStatus = resolveEffectiveBillingStatus({
    subscription,
    tenant,
    paymentFailedAt,
    billingStatusOverride: input.billingStatusOverride,
    now: nowDate,
  });

  if (
    billingStatus === "active" &&
    subscription?.status === "active" &&
    !input.recordPaymentFailure
  ) {
    paymentFailedAt = null;
  }

  const customerId =
    input.customerId ??
    (typeof subscription?.customer === "string"
      ? subscription.customer
      : subscription?.customer?.id) ??
    tenant.stripeCustomerId ??
    null;
  const subscriptionId = subscription?.id ?? tenant.stripeSubscriptionId ?? null;

  const trialEndsAt = resolveTrialEndsAt({
    billingStatus,
    subscription,
    tenant,
  });
  const currentPeriodEndsAt =
    toIso(readSubscriptionPeriodEnd(subscription)) ??
    tenant.currentPeriodEndsAt ??
    null;
  const cancelAt =
    toIso(subscription?.cancel_at) ??
    (subscription?.cancel_at_period_end
      ? currentPeriodEndsAt
      : tenant.cancelAt ?? null);

  const nextTenant: TenantManagementJson = {
    ...tenant,
    plan,
    billingStatus,
    maxSeats: planDefinition.seatLimit,
    billingEmail: tenant.billingEmail ?? null,
    trialEndsAt,
    currentPeriodEndsAt,
    cancelAt,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    paymentFailedAt,
  };

  const nextAdminConfig: AdminConfigJson = {
    ...adminConfig,
    tenantManagement: nextTenant,
  };

  const { error: settingsUpdateError } = await client
    .from("system_settings")
    .update({
      admin_config: nextAdminConfig,
      updated_at: now,
    })
    .eq("company_id", input.companyId);

  if (settingsUpdateError) {
    return { ok: false, message: settingsUpdateError.message };
  }

  const { error: companyUpdateError } = await client
    .from("companies")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_ends_at: trialEndsAt,
      current_period_ends_at: currentPeriodEndsAt,
      cancel_at: cancelAt,
      updated_at: now,
    })
    .eq("id", input.companyId);

  if (companyUpdateError) {
    return { ok: false, message: companyUpdateError.message };
  }

  if (input.auditAction) {
    const auditMetadata = getAuditEventMetadata(input.auditAction);
    const { error: auditError } = await client.from("audit_log").insert({
      action: input.auditAction,
      actorid: input.actorId ?? null,
      company_id: input.companyId,
      table_name: "system_settings",
      recordid: input.companyId,
      metadata: {
        ...auditMetadata,
        ...input.auditMetadata,
        plan,
        billingStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        trialEndsAt,
        currentPeriodEndsAt,
        cancelAt,
        paymentFailedAt,
        paymentGraceEndsAt: getPaymentGraceEndsAt(paymentFailedAt),
      },
    });

    if (auditError) {
      return {
        ok: false,
        message: `Billing synced but audit log failed: ${auditError.message}`,
      };
    }
  }

  return { ok: true };
}

export async function findCompanyIdByStripeCustomer(
  client: SupabaseClient,
  customerId: string,
  metadataCompanyId?: string | null,
): Promise<string | null> {
  if (metadataCompanyId) {
    const { data } = await client
      .from("companies")
      .select("id")
      .eq("id", metadataCompanyId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const { data: company } = await client
    .from("companies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return company?.id ?? null;
}

export async function recordStripeWebhookEvent(
  client: SupabaseClient,
  eventId: string,
  eventType: string,
  companyId: string | null,
): Promise<"processed" | "duplicate"> {
  const { error } = await client.from("stripe_webhook_events").insert({
    id: eventId,
    event_type: eventType,
    company_id: companyId,
  });

  if (error) {
    if (error.code === "23505") {
      return "duplicate";
    }
    throw error;
  }

  return "processed";
}

export const BILLING_AUDIT = {
  checkoutCompleted: AUDIT_ACTIONS.billingCheckoutCompleted,
  subscriptionUpdated: AUDIT_ACTIONS.billingSubscriptionUpdated,
  subscriptionCanceled: AUDIT_ACTIONS.billingSubscriptionCanceled,
  paymentFailed: AUDIT_ACTIONS.billingPaymentFailed,
} as const;

export { getPaymentGraceEndsAt, resolveBillingStatusAfterPaymentFailure };
