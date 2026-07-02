import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";
import { verifyCronRequest } from "@/lib/cron/verifyCron";
import { expireExpiredTrials } from "@/server/billing/expireTrials";

const loggerScope = "cron-billing-trial-expiry";

export const dynamic = "force-dynamic";

const toPlainHeaders = (headers: Headers) => {
  const plain: Record<string, string> = {};
  headers.forEach((value, key) => {
    plain[key] = value;
  });
  return plain;
};

async function handle(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const logger = createServerLogger(loggerScope, {
    requestId,
    tags: ["cron", "billing"],
  });
  const auth = verifyCronRequest(toPlainHeaders(request.headers));

  if (!auth.ok) {
    logger.warn("Cron authentication failed", {
      context: { reason: auth.reason },
    });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  logger.info("Billing trial expiry run started");

  try {
    const result = await expireExpiredTrials(supabaseAdmin);

    logger.info("Billing trial expiry run finished", {
      context: result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("Billing trial expiry cron failed", { error });
    return NextResponse.json(
      { error: "billing_trial_expiry_failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
