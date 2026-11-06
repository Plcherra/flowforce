import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_server/supabaseAdmin"; // pragma: allowlist secret
import { createServerLogger } from "../../_server/utils/logger";
import {
  isOptionalPackId,
  packPriceCanCheckout,
  readPackPriceId,
} from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { requireBillingAuth } from "@/server/billing/requireBillingAuth";
import { checkBillingRouteRateLimit } from "@/server/billing/rateLimitBillingRoute";
import { mapStripeRouteError } from "@/server/billing/stripeRouteErrors";
import { getStripeClient } from "@/server/billing/stripeClient";

const logger = createServerLogger("pack-checkout");

const bodySchema = z.object({
  pack: z.string(),
});

export const dynamic = "force-dynamic";

const jsonError = (
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) => NextResponse.json({ message, ...extra }, { status });

const getRequestOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return request.nextUrl.origin;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const scopedLogger = logger.child({ requestId });

  try {
    const auth = await requireBillingAuth(request);
    if (auth.ok === false) {
      return jsonError(auth.message, auth.status);
    }

    const { companyId, userId, email } = auth.context;
    const rateLimit = checkBillingRouteRateLimit("pack-checkout", userId);
    if (rateLimit.ok === false) {
      return jsonError(
        "Too many checkout attempts. Wait a minute and try again.",
        429,
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
      );
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || !isOptionalPackId(parsed.data.pack)) {
      return jsonError("Invalid pack checkout request.", 400);
    }

    const pack: OptionalPackId = parsed.data.pack;
    const priceId = readPackPriceId(pack);
    if (!priceId) {
      return jsonError(
        "This pack does not have a price yet.",
        409,
        { code: "pack_price_pending" },
      );
    }

    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(priceId);
    if (!packPriceCanCheckout(price)) {
      return jsonError(
        "This pack price is not ready for checkout.",
        409,
        { code: "pack_price_pending" },
      );
    }

    const origin = getRequestOrigin(request);
    const { data: company, error: companyError } = await supabaseAdmin // pragma: allowlist secret
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      scopedLogger.error("Unable to load company for pack checkout", {
        error: companyError,
        context: { companyId },
      });
      return jsonError("Unable to start checkout.", 500);
    }

    const { data: settingsRow } = await supabaseAdmin // pragma: allowlist secret
      .from("system_settings")
      .select("admin_config")
      .eq("company_id", companyId)
      .maybeSingle();

    const tenant = (settingsRow?.admin_config as Record<string, unknown> | null)
      ?.tenantManagement as Record<string, unknown> | undefined;
    const billingEmail =
      (typeof tenant?.billingEmail === "string" && tenant.billingEmail) ||
      (typeof tenant?.primaryOwnerEmail === "string" &&
        tenant.primaryOwnerEmail) ||
      email;

    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billingEmail ?? undefined,
        name: company.name,
        metadata: { company_id: companyId },
      });
      customerId = customer.id;
      await supabaseAdmin // pragma: allowlist secret
        .from("companies")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);
    }

    const metadata = {
      kind: "pack",
      pack,
      company_id: companyId,
      initiated_by: userId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/packs?checkout=success&pack=${pack}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/packs?checkout=canceled&pack=${pack}`,
      client_reference_id: companyId,
      metadata,
      subscription_data: {
        metadata: {
          kind: "pack",
          pack,
          company_id: companyId,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return jsonError("Stripe did not return a checkout URL.", 502);
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    scopedLogger.error("Unexpected pack checkout error", { error });
    const mapped = mapStripeRouteError(error);
    return jsonError(mapped.message, mapped.status);
  }
}
