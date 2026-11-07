import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import {
  packPriceCanCheckout,
  readPackPriceId,
} from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { assertStripeTestSecret } from "@/server/billing/stripeTestMode";
import { getStripeClient } from "@/server/billing/stripeClient";

const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

export type PackCheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; status: number; message: string; code?: string };

function integrationIdentifier(pack: OptionalPackId): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(8);
  let suffix = "";
  for (const byte of bytes) {
    suffix += alphabet[byte % alphabet.length];
  }
  return `flowforce_pack_${pack}_${suffix}`;
}

async function customerHasPackSubscription(
  stripe: Stripe,
  customerId: string,
  pack: OptionalPackId,
): Promise<boolean> {
  const listed = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  return listed.data.some((subscription) => {
    if (!BLOCKING_SUBSCRIPTION_STATUSES.has(subscription.status)) return false;
    return (
      subscription.metadata?.kind === "pack" &&
      subscription.metadata?.pack === pack
    );
  });
}

export async function createPackCheckoutSession(input: {
  pack: OptionalPackId;
  companyId: string;
  userId: string;
  companyName: string;
  billingEmail: string | null;
  existingCustomerId: string | null;
  origin: string;
  persistCustomerId: (customerId: string) => Promise<void>;
}): Promise<PackCheckoutResult> {
  const priceId = readPackPriceId(input.pack);
  if (!priceId) {
    return {
      ok: false,
      status: 409,
      code: "pack_price_pending",
      message: "This pack does not have a price yet.",
    };
  }

  try {
    assertStripeTestSecret(process.env.STRIPE_SECRET_KEY);
  } catch {
    return {
      ok: false,
      status: 403,
      code: "stripe_test_mode_required",
      message: "Pack checkout is available in Stripe test mode only.",
    };
  }

  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(priceId);
  if (!packPriceCanCheckout(price)) {
    return {
      ok: false,
      status: 409,
      code: "pack_price_pending",
      message: "This pack price is not ready for checkout.",
    };
  }

  let customerId = input.existingCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.billingEmail ?? undefined,
      name: input.companyName,
      metadata: { company_id: input.companyId },
    });
    customerId = customer.id;
    await input.persistCustomerId(customerId);
  }

  if (await customerHasPackSubscription(stripe, customerId, input.pack)) {
    return {
      ok: false,
      status: 409,
      code: "pack_already_subscribed",
      message: "This pack already has a subscription.",
    };
  }

  const metadata = {
    kind: "pack",
    pack: input.pack,
    company_id: input.companyId,
    initiated_by: input.userId,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${input.origin}/app/packs/${input.pack}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/app/packs/${input.pack}?checkout=canceled`,
    client_reference_id: input.companyId,
    metadata,
    subscription_data: {
      metadata: {
        kind: "pack",
        pack: input.pack,
        company_id: input.companyId,
      },
    },
    allow_promotion_codes: true,
    integration_identifier: integrationIdentifier(input.pack),
  });

  if (!session.url) {
    return {
      ok: false,
      status: 502,
      message: "Stripe did not return a checkout URL.",
    };
  }

  return { ok: true, url: session.url, sessionId: session.id };
}
