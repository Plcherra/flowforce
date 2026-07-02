import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";
import { requireBillingAuth } from "@/server/billing/requireBillingAuth";
import { checkBillingRouteRateLimit } from "@/server/billing/rateLimitBillingRoute";
import { mapStripeRouteError } from "@/server/billing/stripeRouteErrors";
import { getStripeClient } from "@/server/billing/stripeClient";
import { getStripePriceIdForPlan } from "@/server/billing/stripePrices";
import {
  BILLING_PLAN_KEYS,
  normalizeBillingPlan,
} from "@/services/billing/billingPlans";

const logger = createServerLogger("stripe-create-checkout-session");

const bodySchema = z.object({
  plan: z.enum(BILLING_PLAN_KEYS),
  intent: z.enum(["upgrade", "reactivate"]).optional(),
});

export const dynamic = "force-dynamic";

const jsonError = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ message, details }, { status });

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

    const rateLimit = checkBillingRouteRateLimit(
      "create-checkout-session",
      userId,
    );
    if (rateLimit.ok === false) {
      return jsonError(
        "Too many checkout attempts. Wait a minute and try again.",
        429,
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
      );
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonError("Invalid checkout request.", 400, parsed.error.flatten());
    }

    const plan = normalizeBillingPlan(parsed.data.plan);
    const intent = parsed.data.intent ?? "upgrade";
    const priceId = getStripePriceIdForPlan(plan);
    const origin = getRequestOrigin(request);

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      scopedLogger.error("Unable to load company for checkout", {
        error: companyError,
        context: { companyId },
      });
      return jsonError("Unable to start checkout.", 500);
    }

    const { data: settingsRow } = await supabaseAdmin
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

    const stripe = getStripeClient();
    let customerId = company.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billingEmail ?? undefined,
        name: company.name,
        metadata: {
          company_id: companyId,
        },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("companies")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/settings?tab=billing&checkout=success`,
      cancel_url: `${origin}/pricing?intent=${intent}&checkout=canceled`,
      client_reference_id: companyId,
      metadata: {
        company_id: companyId,
        plan,
        intent,
        initiated_by: userId,
      },
      subscription_data: {
        metadata: {
          company_id: companyId,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return jsonError("Stripe did not return a checkout URL.", 502);
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    scopedLogger.error("Unexpected checkout session error", { error });
    const mapped = mapStripeRouteError(error);
    return jsonError(mapped.message, mapped.status);
  }
}
