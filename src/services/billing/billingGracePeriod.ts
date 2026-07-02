import type { BillingStatus } from "@/services/billing/billingPlans";

export const DEFAULT_BILLING_PAYMENT_GRACE_DAYS = 7;

export function getBillingPaymentGraceDays(
  configuredDays = DEFAULT_BILLING_PAYMENT_GRACE_DAYS,
) {
  return Number.isFinite(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_BILLING_PAYMENT_GRACE_DAYS;
}

export function resolveBillingStatusAfterPaymentFailure(
  paymentFailedAt: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  now = new Date(),
  graceDays = DEFAULT_BILLING_PAYMENT_GRACE_DAYS,
): BillingStatus {
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    return subscriptionStatus === "trialing" ? "trial" : "active";
  }

  if (
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "unpaid" ||
    subscriptionStatus === "incomplete_expired" ||
    subscriptionStatus === "paused"
  ) {
    return "deactivated";
  }

  if (!paymentFailedAt) {
    return subscriptionStatus === "past_due" ? "active" : "deactivated";
  }

  const failedAt = new Date(paymentFailedAt);
  if (!Number.isFinite(failedAt.getTime())) {
    return "deactivated";
  }

  const graceMs = getBillingPaymentGraceDays(graceDays) * 24 * 60 * 60 * 1000;
  if (now.getTime() - failedAt.getTime() < graceMs) {
    return "active";
  }

  return "deactivated";
}

export function getPaymentGraceEndsAt(
  paymentFailedAt: string | null | undefined,
  graceDays = DEFAULT_BILLING_PAYMENT_GRACE_DAYS,
) {
  if (!paymentFailedAt) return null;
  const failedAt = new Date(paymentFailedAt);
  if (!Number.isFinite(failedAt.getTime())) return null;
  return new Date(
    failedAt.getTime() + getBillingPaymentGraceDays(graceDays) * 24 * 60 * 60 * 1000,
  ).toISOString();
}
