import {
  BILLING_PLAN_KEYS,
  normalizeBillingPlan,
  type BillingPlanKey,
} from "@/services/billing/billingPlans";

const readPriceEnv = (key: BillingPlanKey) => {
  const envKey = `STRIPE_PRICE_${key.toUpperCase()}` as const;
  return process.env[envKey]?.trim() || null;
};

export const STRIPE_PRICE_BY_PLAN: Record<BillingPlanKey, string | null> = {
  starter: readPriceEnv("starter"),
  growth: readPriceEnv("growth"),
  enterprise: readPriceEnv("enterprise"),
};

export function getStripePriceIdForPlan(plan: string | null | undefined): string {
  const normalized = normalizeBillingPlan(plan);
  const priceId = STRIPE_PRICE_BY_PLAN[normalized];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for plan: ${normalized}`);
  }
  return priceId;
}

export function planKeyFromStripePriceId(
  priceId: string | null | undefined,
): BillingPlanKey | null {
  if (!priceId) return null;
  for (const plan of BILLING_PLAN_KEYS) {
    if (STRIPE_PRICE_BY_PLAN[plan] === priceId) {
      return plan;
    }
  }
  return null;
}

export function planKeyFromStripeSubscription(
  subscription: {
    items?: { data?: Array<{ price?: { id?: string | null } | null }> };
    metadata?: Record<string, string> | null;
  } | null,
): BillingPlanKey | null {
  if (!subscription) return null;

  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan) {
    return normalizeBillingPlan(metadataPlan);
  }

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  return planKeyFromStripePriceId(priceId);
}
