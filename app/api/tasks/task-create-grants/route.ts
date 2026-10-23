import { NextRequest, NextResponse } from "next/server";
import { applyTaskCreateGrant } from "@/features/roles/constants/taskCreateGrantStore";
import type { TaskCreateGrant } from "@/features/roles/constants/taskCreateScope";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "../../_server/supabaseAdmin";

export const dynamic = "force-dynamic";

function bearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

function asGrant(value: unknown): TaskCreateGrant | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const grant = value as Record<string, unknown>;
  if (typeof grant.id !== "string" || typeof grant.granteeId !== "string") return null;
  return {
    id: grant.id,
    granteeId: grant.granteeId,
    canGrant: grant.canGrant === true,
    levels: Array.isArray(grant.levels)
      ? grant.levels.filter((level): level is number => typeof level === "number")
      : [],
    userIds: Array.isArray(grant.userIds)
      ? grant.userIds.filter((id): id is string => typeof id === "string")
      : [],
    revoked: false,
  };
}

export async function POST(request: NextRequest) {
  const token = bearer(request);
  if (!token) {
    return NextResponse.json({ message: "Missing authenticated session." }, { status: 401 });
  }
  const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userResult?.user) {
    return NextResponse.json({ message: "Unable to verify session." }, { status: 401 });
  }
  const actor = userResult.user;
  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    grant?: unknown;
    grantId?: unknown;
  };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company_id, role")
    .eq("id", actor.id)
    .maybeSingle();
  const companyId = typeof profile?.company_id === "string" ? profile.company_id : null;
  if (!companyId) {
    return NextResponse.json({ message: "No company context available." }, { status: 403 });
  }
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("owner_id, template_config")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError || !company) {
    return NextResponse.json({ message: "Unable to load the company." }, { status: 500 });
  }
  const isOwner = company.owner_id === actor.id || profile?.role === "owner";
  const result = applyTaskCreateGrant({
    config: company.template_config,
    actorId: actor.id,
    isOwner,
    action: body.action === "revoke" ? "revoke" : "grant",
    grant: asGrant(body.grant) ?? undefined,
    grantId: typeof body.grantId === "string" ? body.grantId : undefined,
  });
  if (result.ok === false) {
    return NextResponse.json({ message: result.reason }, { status: 403 });
  }
  const { error: updateError } = await supabaseAdmin
    .from("companies")
    .update({ template_config: result.config as Json })
    .eq("id", companyId);
  if (updateError) {
    return NextResponse.json({ message: "Unable to save the grant." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
