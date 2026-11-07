import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_server/supabaseAdmin"; // pragma: allowlist secret
import { createServerLogger } from "../../_server/utils/logger";
import {
  isOptionalPackId,
  packCheckoutIsPaid,
  readPackCheckoutMetadata,
} from "@/config/packCatalog";
import { requireBillingAuth } from "@/server/billing/requireBillingAuth";
import { checkBillingRouteRateLimit } from "@/server/billing/rateLimitBillingRoute";
import { enablePurchasedPack } from "@/server/billing/enablePurchasedPack";
import { mapStripeRouteError } from "@/server/billing/stripeRouteErrors";
import { getStripeClient } from "@/server/billing/stripeClient";
import {
  assertStripeTestSecret,
  StripeTestModeError,
} from "@/server/billing/stripeTestMode";

const logger = createServerLogger("pack-confirm");

const bodySchema = z.object({
  pack: z.string(),
  sessionId: z.string().regex(/^cs_(test|live)_[\w-]+$/),
});

export const dynamic = "force-dynamic";

const jsonError = (
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) => NextResponse.json({ message, ...extra }, { status });

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const scopedLogger = logger.child({ requestId });

  try {
    const auth = await requireBillingAuth(request);
    if (auth.ok === false) {
      return jsonError(auth.message, auth.status);
    }

    const { companyId, userId } = auth.context;
    const rateLimit = checkBillingRouteRateLimit("pack-confirm", userId);
    if (rateLimit.ok === false) {
      return jsonError(
        "Too many checkout attempts. Wait a minute and try again.",
        429,
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
      );
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || !isOptionalPackId(parsed.data.pack)) {
      return jsonError("Invalid pack confirmation.", 400);
    }

    try {
      assertStripeTestSecret(process.env.STRIPE_SECRET_KEY);
    } catch (error) {
      if (error instanceof StripeTestModeError) {
        return jsonError("Pack checkout is available in Stripe test mode only.", 403, {
          code: "stripe_test_mode_required",
        });
      }
      throw error;
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
    if (session.livemode) {
      return jsonError("Pack checkout is available in Stripe test mode only.", 403, {
        code: "stripe_test_mode_required",
      });
    }
    const purchasedPack = readPackCheckoutMetadata(session.metadata);
    const sessionCompanyId =
      session.metadata?.company_id ?? session.client_reference_id ?? null;

    if (purchasedPack !== parsed.data.pack || sessionCompanyId !== companyId) {
      return jsonError("This checkout does not match the pack.", 403);
    }

    if (!packCheckoutIsPaid(session)) {
      return jsonError("Checkout is not paid yet.", 409, {
        code: "pack_checkout_incomplete",
      });
    }

    const result = await enablePurchasedPack(supabaseAdmin, { // pragma: allowlist secret
      companyId,
      pack: purchasedPack,
      actorId: userId,
      checkoutSessionId: session.id,
      source: "pack.checkout.confirm",
    });

    if (result.ok === false) {
      scopedLogger.error("Unable to enable purchased pack", {
        context: { companyId, pack: purchasedPack },
      });
      return jsonError("Unable to enable the pack.", 500);
    }

    return NextResponse.json({ ok: true, pack: purchasedPack, flags: result.flags });
  } catch (error) {
    scopedLogger.error("Unexpected pack confirm error", { error });
    const mapped = mapStripeRouteError(error);
    return jsonError(mapped.message, mapped.status);
  }
}
