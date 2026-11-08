/**
 * Pack discovery catalog.
 *
 * Locked prices (USD, monthly, per company). Ops is the base. Team,
 * Insights, and Stock are à la carte add-ons and do not replace it.
 *
 * Amounts are display-only. Stripe price ids come from server env:
 *
 * - STRIPE_PRICE_OPS
 * - STRIPE_PRICE_PACK_TEAM
 * - STRIPE_PRICE_PACK_INSIGHTS
 * - STRIPE_PRICE_PACK_STOCK
 *
 * Checkout quantity is 1 (one company, not per seat). A yearly price is refused.
 * One Stripe account is used. Do not put price ids or secret keys in code.
 */

import {
  DEFAULT_PACK_FLAGS,
  parsePackFlagOverrides,
  readPackFlagsFromAdminConfig,
  type OptionalPackId,
  type PackFlags,
} from "@/config/packFlags";

export const PACK_PRICE_ENV: Record<OptionalPackId, string> = {
  team: "STRIPE_PRICE_PACK_TEAM",
  insights: "STRIPE_PRICE_PACK_INSIGHTS",
  stock: "STRIPE_PRICE_PACK_STOCK",
};

/** Locked monthly USD amount per company. Display only; Stripe uses the env price id. */
export const OPS_MONTHLY_USD = 59;
export const OPS_PRICE_ENV = "STRIPE_PRICE_OPS";

export const PACK_MONTHLY_USD: Record<OptionalPackId, number> = {
  team: 19,
  insights: 19,
  stock: 29,
};

/** @deprecated Use PACK_MONTHLY_USD. Kept so older imports still read the locked amounts. */
export const PACK_PLACEHOLDER_MONTHLY_USD = PACK_MONTHLY_USD;

export function readOpsPriceId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const trimmed = env[OPS_PRICE_ENV]?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export const OPTIONAL_PACK_IDS: OptionalPackId[] = ["team", "insights", "stock"];

export function isOptionalPackId(value: unknown): value is OptionalPackId {
  return value === "team" || value === "insights" || value === "stock";
}

export function readPackPriceId(
  pack: OptionalPackId,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const value = env[PACK_PRICE_ENV[pack]];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/** A pack can be sent to Stripe only when the price recurs monthly. */
export function packPriceCanCheckout(price: {
  recurring?: { interval?: string | null } | null;
} | null): boolean {
  return price?.recurring?.interval === "month";
}

export function isPackBillingMetadata(
  metadata?: { kind?: string | null } | null,
): boolean {
  return metadata?.kind === "pack";
}

export function readPackCheckoutMetadata(
  metadata?: { kind?: string | null; pack?: string | null } | null,
): OptionalPackId | null {
  if (!isPackBillingMetadata(metadata)) return null;
  return isOptionalPackId(metadata?.pack) ? metadata.pack : null;
}

export function packCheckoutIsPaid(session: {
  payment_status?: string | null;
}): boolean {
  return (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Turn one optional pack on without dropping the rest of admin_config. */
export function withPackEnabled(
  adminConfig: unknown,
  pack: OptionalPackId,
): Record<string, unknown> {
  return withPackFlag(adminConfig, pack, true);
}

/** Turn one optional pack off without dropping the rest of admin_config. */
export function withPackDisabled(
  adminConfig: unknown,
  pack: OptionalPackId,
): Record<string, unknown> {
  return withPackFlag(adminConfig, pack, false);
}

function withPackFlag(
  adminConfig: unknown,
  pack: OptionalPackId,
  enabled: boolean,
): Record<string, unknown> {
  const root = isRecord(adminConfig) ? { ...adminConfig } : {};
  const current = readPackFlagsFromAdminConfig(root);
  const previousFlags = isRecord(root.packFlags) ? root.packFlags : {};
  const flags: PackFlags = {
    ...current,
    ops: true,
    [pack]: enabled,
  };

  return {
    ...root,
    packFlags: {
      ...previousFlags,
      ...flags,
    },
  };
}

/** Active or trialing pack subscriptions keep the flag on. */
export function packSubscriptionGrantsAccess(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/**
 * A canceled, deleted, unpaid, or expired pack subscription turns that flag off.
 * cancel_at_period_end while the subscription is still active does not.
 */
export function packSubscriptionRevokesAccess(
  status: string | null | undefined,
  eventType: string,
): boolean {
  return (
    eventType === "customer.subscription.deleted" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"
  );
}

/**
 * New companies start on Operations. Leave an existing packFlags object
 * alone so a retry cannot turn a purchased pack back off.
 */
export function withBasicOpsPackFlags(adminConfig: unknown): Record<string, unknown> {
  const root = isRecord(adminConfig) ? adminConfig : {};
  if (parsePackFlagOverrides(isRecord(root) ? root.packFlags : null)) {
    return root;
  }

  return {
    ...root,
    packFlags: { ...DEFAULT_PACK_FLAGS },
  };
}
