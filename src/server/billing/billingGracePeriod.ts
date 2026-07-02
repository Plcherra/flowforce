import {
  getBillingPaymentGraceDays as getGraceDaysFromEnv,
  resolveBillingStatusAfterPaymentFailure as resolveGraceStatus,
  getPaymentGraceEndsAt as getGraceEndsAt,
} from "@/services/billing/billingGracePeriod";

export function getBillingPaymentGraceDays() {
  const parsed = Number(process.env.BILLING_PAYMENT_GRACE_DAYS);
  return getGraceDaysFromEnv(
    Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
  );
}

export function resolveBillingStatusAfterPaymentFailure(
  paymentFailedAt: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  now = new Date(),
) {
  return resolveGraceStatus(
    paymentFailedAt,
    subscriptionStatus,
    now,
    getBillingPaymentGraceDays(),
  );
}

export function getPaymentGraceEndsAt(paymentFailedAt: string | null | undefined) {
  return getGraceEndsAt(paymentFailedAt, getBillingPaymentGraceDays());
}
