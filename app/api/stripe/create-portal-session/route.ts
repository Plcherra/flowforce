import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";
import { requireBillingAuth } from "@/server/billing/requireBillingAuth";
import { checkBillingRouteRateLimit } from "@/server/billing/rateLimitBillingRoute";
import { mapStripeRouteError } from "@/server/billing/stripeRouteErrors";
import { getStripeClient } from "@/server/billing/stripeClient";

const logger = createServerLogger("stripe-create-portal-session");

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

    const { companyId, userId } = auth.context;

    const rateLimit = checkBillingRouteRateLimit(
      "create-portal-session",
      userId,
    );
    if (rateLimit.ok === false) {
      return jsonError(
        "Too many billing portal requests. Wait a minute and try again.",
        429,
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
      );
    }

    const origin = getRequestOrigin(request);

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      scopedLogger.error("Unable to load company for portal session", {
        error: companyError,
        context: { companyId },
      });
      return jsonError("Unable to open billing portal.", 500);
    }

    const customerId = company?.stripe_customer_id;
    if (!customerId) {
      return jsonError(
        "No Stripe customer exists for this workspace yet. Upgrade first.",
        409,
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/app/settings?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    scopedLogger.error("Unexpected portal session error", { error });
    const mapped = mapStripeRouteError(error);
    return jsonError(mapped.message, mapped.status);
  }
}
