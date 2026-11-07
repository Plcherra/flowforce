import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_server/supabaseAdmin"; // pragma: allowlist secret
import { createServerLogger } from "../../_server/utils/logger";
import { isOptionalPackId } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";
import { requireBillingAuth } from "@/server/billing/requireBillingAuth";
import { checkBillingRouteRateLimit } from "@/server/billing/rateLimitBillingRoute";
import { mapStripeRouteError } from "@/server/billing/stripeRouteErrors";
import { createPackCheckoutSession } from "@/server/billing/createPackCheckout";

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
    const origin = getRequestOrigin(request);
    const [companyResult, settingsResult] = await Promise.all([
      supabaseAdmin // pragma: allowlist secret
        .from("companies")
        .select("id, name, stripe_customer_id")
        .eq("id", companyId)
        .maybeSingle(),
      supabaseAdmin // pragma: allowlist secret
        .from("system_settings")
        .select("admin_config")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);
    const { data: company, error: companyError } = companyResult;
    const settingsRow = settingsResult.data;

    if (companyError || !company) {
      scopedLogger.error("Unable to load company for pack checkout", {
        error: companyError,
        context: { companyId },
      });
      return jsonError("Unable to start checkout.", 500);
    }

    const tenant = (settingsRow?.admin_config as Record<string, unknown> | null)
      ?.tenantManagement as Record<string, unknown> | undefined;
    const billingEmail =
      (typeof tenant?.billingEmail === "string" && tenant.billingEmail) ||
      (typeof tenant?.primaryOwnerEmail === "string" &&
        tenant.primaryOwnerEmail) ||
      email;

    const result = await createPackCheckoutSession({
      pack,
      companyId,
      userId,
      companyName: company.name,
      billingEmail,
      existingCustomerId: company.stripe_customer_id,
      origin,
      persistCustomerId: async (customerId) => {
        await supabaseAdmin // pragma: allowlist secret
          .from("companies")
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
      },
    });

    if (result.ok === false) {
      return jsonError(result.message, result.status, { code: result.code });
    }

    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (error) {
    scopedLogger.error("Unexpected pack checkout error", { error });
    const mapped = mapStripeRouteError(error);
    return jsonError(mapped.message, mapped.status);
  }
}
