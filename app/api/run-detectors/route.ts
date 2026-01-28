import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { runKpiDetectors } from "../_server/ops/detectors/runKpiDetectors";
import { detectIssues } from "../_server/ops/issues/detectIssues";
import { supabaseAdmin } from "../_server/supabaseAdmin";
import { generateAutoPlanForOrg } from "../_server/ops/detectors/autoPlanBuilder";
import { createServerLogger } from "../_server/utils/logger";
import { verifyCronRequest } from "@/lib/cron/verifyCron";

export const dynamic = "force-dynamic";

interface OrganizationRow {
  id: string;
}

const toPlainHeaders = (headers: Headers) => {
  const plain: Record<string, string> = {};
  headers.forEach((value, key) => {
    plain[key] = value;
  });
  return plain;
};

async function handle(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const logger = createServerLogger("run-detectors", {
    requestId,
    tags: ["cron", "ops"],
  });

  try {
    // Use consistent cron authentication
    const auth = verifyCronRequest(toPlainHeaders(request.headers));
    if (!auth.ok) {
      logger.warn("Unauthorized detector invocation attempted", {
        context: { reason: auth.reason },
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Use companies table (organizations might be legacy/alias)
    const { data: orgs, error } = await supabaseAdmin
      .from("companies")
      .select("id");

    if (error) {
      logger.error("Failed to load companies", { error });
      throw error;
    }

    logger.info("Running detectors cron", {
      context: { orgCount: orgs?.length ?? 0 },
    });

    let processed = 0;
    let failures = 0;

    for (const org of (orgs ?? []) as OrganizationRow[]) {
      const id = org.id;
      const orgLogger = logger.child({ orgId: id });

      orgLogger.info("Starting detectors for org");

      try {
        await runKpiDetectors({ orgId: id });
        await detectIssues({ orgId: id });
        await generateAutoPlanForOrg(id);
        processed += 1;
        orgLogger.info("Detectors completed");
      } catch (error) {
        failures += 1;
        orgLogger.error("Detector run failed", { error });
      }
    }

    logger.info("Detector cron finished", {
      context: { processed, failures, total: orgs?.length ?? 0 },
    });

    return NextResponse.json({
      ok: true,
      processed,
      failures,
      total: orgs?.length ?? 0,
    });
  } catch (err) {
    logger.error("Detector cron error", { error: err });
    return NextResponse.json(
      { error: "Cron error", details: String(err) },
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
