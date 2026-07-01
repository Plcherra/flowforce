import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  AUDIT_ACTIONS,
  getAuditEventMetadata,
} from "@/services/audit/auditEvents";
import {
  SUPPORT_IMPERSONATION_DECISION,
  type SupportToolAction,
} from "@/services/support/supportToolingPolicy";
import { supabaseAdmin } from "../../../_server/supabaseAdmin";
import { verifyOnboardingSetup } from "../../../_server/onboardingSetup";
import { ensureProductCompanyRoles } from "../../../_server/productRolesSetup";
import { auditServiceRoleOperation } from "../../../_server/supabaseAdminAudit";
import { createServerLogger } from "../../../_server/utils/logger";

export const dynamic = "force-dynamic";

const logger = createServerLogger("internal-support-tenant");

type CountResult = {
  count: number;
  error?: string;
};

type SupportTenantDiagnostics = {
  requestId: string;
  companyId: string;
  userId: string | null;
  health: "healthy" | "degraded" | "critical";
  missing: string[];
  company: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  counts: Record<string, CountResult>;
  setup: Awaited<ReturnType<typeof verifyOnboardingSetup>> | null;
  impersonation: typeof SUPPORT_IMPERSONATION_DECISION;
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const authorizeSupportRequest = (request: NextRequest) => {
  const expectedToken = process.env.SUPPORT_ADMIN_TOKEN;
  if (!expectedToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Support tooling is not configured." },
        { status: 503 },
      ),
    };
  }

  const providedToken = request.headers.get("x-support-token") ?? "";
  if (!providedToken || !safeEqual(providedToken, expectedToken)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, actorLabel: request.headers.get("x-support-actor") };
};

const countRows = async (
  table: string,
  filters: Record<string, string>,
): Promise<CountResult> => {
  let query = supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true });

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;
  return error
    ? { count: 0, error: error.message ?? String(error) }
    : { count: count ?? 0 };
};

const writeAuditEvent = async (params: {
  companyId: string | null;
  userId?: string | null;
  action: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) => {
  const eventMetadata = getAuditEventMetadata(params.action);
  await supabaseAdmin.from("audit_log").insert({
    company_id: params.companyId,
    actorid: params.userId ?? null,
    targetuser_id: params.userId ?? null,
    action: params.action,
    table_name: "support_tool_runs",
    recordid: params.requestId,
    metadata: {
      ...eventMetadata,
      requestId: params.requestId,
      ...params.metadata,
    },
  });
};

const startSupportRun = async (params: {
  requestId: string;
  companyId: string | null;
  userId: string | null;
  action: SupportToolAction;
  dryRun: boolean;
  actorLabel: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const { data, error } = await supabaseAdmin
    .from("support_tool_runs")
    .insert({
      requestid: params.requestId,
      company_id: params.companyId,
      targetuser_id: params.userId,
      tool: "tenant_support",
      action: params.action,
      status: "started",
      dry_run: params.dryRun,
      actorlabel: params.actorLabel,
      metadata: params.metadata ?? {},
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data?.id as string | undefined;
};

const finishSupportRun = async (
  id: string | undefined,
  status: "succeeded" | "failed" | "blocked",
  params: { errorMessage?: string; metadata?: Record<string, unknown> } = {},
) => {
  if (!id) return;
  await supabaseAdmin
    .from("support_tool_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? {},
    })
    .eq("id", id);
};

const collectDiagnostics = async (
  companyId: string,
  userId: string | null,
  requestId: string,
): Promise<SupportTenantDiagnostics> => {
  const missing: string[] = [];

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select(
      "id, name, owner_id, registration_complete, lifecycle_status, deleted_at, created_at, updated_at",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    missing.push("company");
  }

  const profileQuery = userId
    ? supabaseAdmin
        .from("profiles")
        .select(
          "id, email, company_id, role, is_company_admin, employment_status",
        )
        .eq("id", userId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const { data: profile, error: profileError } = await profileQuery;
  if (userId && (profileError || !profile)) {
    missing.push("ownerprofile");
  }

  const counts = {
    companyMembers: await countRows("company_members", {
      company_id: companyId,
    }),
    systemSettings: await countRows("system_settings", {
      company_id: companyId,
    }),
    companyRoles: await countRows("company_roles", { company_id: companyId }),
    setupAuditEvents: await countRows("audit_log", {
      company_id: companyId,
      action: "company.setup_verified",
    }),
    dataExports: await countRows("companydata_exports", {
      company_id: companyId,
    }),
    activeLegalHolds: await countRows("lifecycle_legal_holds", {
      company_id: companyId,
      status: "active",
    }),
  };

  if (counts.companyMembers.error || counts.companyMembers.count < 1) {
    missing.push("owner_membership");
  }
  if (counts.systemSettings.error || counts.systemSettings.count !== 1) {
    missing.push("system_settings");
  }
  if (counts.companyRoles.error || counts.companyRoles.count < 4) {
    missing.push("company_roles");
  }
  if (counts.setupAuditEvents.error || counts.setupAuditEvents.count < 1) {
    missing.push("setup_audit_event");
  }

  const setup =
    userId && company
      ? await verifyOnboardingSetup(supabaseAdmin, { companyId, userId })
      : null;

  if (setup && !setup.ok) {
    missing.push(...setup.missing);
  }

  const uniqueMissing = [...new Set(missing)];
  const health =
    uniqueMissing.includes("company") || uniqueMissing.includes("ownerprofile")
      ? "critical"
      : uniqueMissing.length > 0
        ? "degraded"
        : "healthy";

  return {
    requestId,
    companyId,
    userId,
    health,
    missing: uniqueMissing,
    company: company ?? null,
    profile: profile ?? null,
    counts,
    setup,
    impersonation: SUPPORT_IMPERSONATION_DECISION,
  };
};

const repairOnboardingBaseline = async (params: {
  companyId: string;
  userId: string;
  requestId: string;
}) => {
  const { companyId, userId, requestId } = params;

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, name, owner_id")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    throw new Error("Cannot repair a missing company record.");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, first_name, last_name, phone")
    .eq("id", userId)
    .maybeSingle();

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    company_id: companyId,
    email: profile?.email ?? null,
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone: profile?.phone ?? null,
    role: "owner",
    is_company_admin: true,
    employment_status: "active",
    updated_at: new Date().toISOString(),
  });

  await supabaseAdmin
    .from("companies")
    .update({
      owner_id: company.owner_id ?? userId,
      registration_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  await supabaseAdmin.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: userId,
      role: "owner",
      added_at: new Date().toISOString(),
    },
    { onConflict: "company_id,user_id" },
  );

  await supabaseAdmin
    .from("system_settings")
    .upsert({ company_id: companyId }, { onConflict: "company_id" });

  await ensureProductCompanyRoles(supabaseAdmin, { companyId, userId });

  await supabaseAdmin.from("audit_log").insert({
    company_id: companyId,
    actorid: userId,
    targetuser_id: userId,
    action: "company.setup_verified",
    table_name: "companies",
    recordid: companyId,
    new_values: { source: "support.repair_onboarding_baseline", requestId },
  });
};

export async function GET(request: NextRequest) {
  const auth = authorizeSupportRequest(request);
  if (!auth.ok) return auth.response;

  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  const userId = url.searchParams.get("userId");

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId is required" },
      { status: 400 },
    );
  }

  const runId = await startSupportRun({
    requestId,
    companyId,
    userId,
    action: "tenant_diagnostics",
    dryRun: true,
    actorLabel: auth.actorLabel,
  });

  try {
    auditServiceRoleOperation({
      requestId,
      companyId,
      userId: userId ?? undefined,
      operation: "SUPPORT_TENANT_DIAGNOSTICS",
      table: "support_tool_runs",
      metadata: { actorLabel: auth.actorLabel },
    });

    const diagnostics = await collectDiagnostics(companyId, userId, requestId);
    await writeAuditEvent({
      companyId,
      userId,
      action: AUDIT_ACTIONS.supportTenantDiagnosticsViewed,
      requestId,
      metadata: { health: diagnostics.health, missing: diagnostics.missing },
    });
    await finishSupportRun(runId, "succeeded", {
      metadata: { health: diagnostics.health, missing: diagnostics.missing },
    });

    return NextResponse.json(diagnostics);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Support diagnostics failed", { error, requestId });
    await finishSupportRun(runId, "failed", { errorMessage: message });
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = authorizeSupportRequest(request);
  if (!auth.ok) return auth.response;

  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null);
  const companyId = body?.companyId;
  const userId = body?.userId;
  const action = body?.action as SupportToolAction | undefined;
  const dryRun = body?.dryRun !== false;

  if (!companyId || !userId || action !== "repair_onboarding_baseline") {
    return NextResponse.json(
      {
        error:
          "companyId, userId, and action=repair_onboarding_baseline are required",
      },
      { status: 400 },
    );
  }

  const runId = await startSupportRun({
    requestId,
    companyId,
    userId,
    action,
    dryRun,
    actorLabel: auth.actorLabel,
  });

  try {
    const before = await collectDiagnostics(companyId, userId, requestId);

    if (dryRun) {
      await finishSupportRun(runId, "succeeded", {
        metadata: { dryRun, health: before.health, missing: before.missing },
      });
      return NextResponse.json({ requestId, dryRun, before });
    }

    auditServiceRoleOperation({
      requestId,
      companyId,
      userId,
      operation: "SUPPORT_REPAIR_ONBOARDING_BASELINE",
      table: "support_tool_runs",
      metadata: { actorLabel: auth.actorLabel, beforeMissing: before.missing },
    });

    await repairOnboardingBaseline({ companyId, userId, requestId });
    const after = await collectDiagnostics(companyId, userId, requestId);

    await writeAuditEvent({
      companyId,
      userId,
      action: AUDIT_ACTIONS.supportTenantRepairExecuted,
      requestId,
      metadata: {
        beforeMissing: before.missing,
        afterMissing: after.missing,
        actorLabel: auth.actorLabel,
      },
    });
    await finishSupportRun(
      runId,
      after.health === "healthy" ? "succeeded" : "failed",
      {
        metadata: {
          beforeMissing: before.missing,
          afterMissing: after.missing,
        },
      },
    );

    return NextResponse.json({ requestId, dryRun, before, after });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Support repair failed", { error, requestId });
    await finishSupportRun(runId, "failed", { errorMessage: message });
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
