/**
 * Pack discovery catalog.
 *
 * Team, Insights, and Stock prices are not decided yet. The UI shows a
 * placeholder. Checkout stays off until a recurring Stripe price id is set
 * in the matching server env var:
 *
 * - STRIPE_PRICE_PACK_TEAM
 * - STRIPE_PRICE_PACK_INSIGHTS
 * - STRIPE_PRICE_PACK_STOCK
 *
 * Those prices are not STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, or
 * STRIPE_PRICE_ENTERPRISE. Quantity is 1 per company until seat pricing
 * is decided. The Stripe price's own interval answers monthly vs yearly.
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

/** A pack can be sent to Stripe only when the price is recurring. */
export function packPriceCanCheckout(price: {
  recurring?: unknown;
} | null): boolean {
  return Boolean(price?.recurring);
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
  const root = isRecord(adminConfig) ? { ...adminConfig } : {};
  const current = readPackFlagsFromAdminConfig(root);
  const previousFlags = isRecord(root.packFlags) ? root.packFlags : {};
  const flags: PackFlags = {
    ...current,
    ops: true,
    [pack]: true,
  };

  return {
    ...root,
    packFlags: {
      ...previousFlags,
      ...flags,
    },
  };
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
