import { NextRequest, NextResponse } from "next/server";
import { actorCanRunAutomation } from "@/server/automation/automationAccess";
import { runStoredAutomation } from "@/server/automation/runStoredAutomation";
import { supabaseAdmin } from "../../../_server/supabaseAdmin";

export const dynamic = "force-dynamic";

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
};

async function resolveActor(userId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id, role, role_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile?.company_id) return null;

  const companyId = String(profile.company_id);
  const { count: membershipCount, error: membershipError } = await supabaseAdmin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("user_id", userId);
  const member = !membershipError && (membershipCount ?? 0) > 0;
  if (!member && profile.company_id !== companyId) return null;

  const roleName = typeof profile.role === "string" ? profile.role.trim() : "";
  let role: {
    permissions?: unknown;
    product_level?: string | null;
    company_id?: string | null;
  } | null = null;
  if (profile.role_id || roleName) {
    let roleQuery = supabaseAdmin
      .from("company_roles")
      .select("permissions, product_level, company_id")
      .eq("company_id", companyId);
    roleQuery = profile.role_id
      ? roleQuery.eq("id", profile.role_id)
      : roleQuery.ilike("name", roleName);
    const { data: roles } = await roleQuery.limit(1);
    role = (Array.isArray(roles) ? roles[0] : roles) ?? null;
  }
  if (role?.company_id && role.company_id !== companyId) {
    return { userId, companyId, canRun: false };
  }

  const { data: overrides } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key, permission_value")
    .eq("user_id", userId);

  return {
    userId,
    companyId,
    canRun: actorCanRunAutomation({
      productLevel: role?.product_level ?? null,
      permissions: role?.permissions,
      overrides: overrides ?? [],
    }),
  };
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  if (userError || !userResult?.user) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const suggestionId =
    typeof body?.suggestionId === "string" ? body.suggestionId.trim() : "";
  if (!suggestionId) {
    return NextResponse.json({ code: "not_found" }, { status: 400 });
  }

  const actor = await resolveActor(userResult.user.id);
  if (!actor) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  if (!actor.canRun) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  try {
    const result = await runStoredAutomation(supabaseAdmin, {
      suggestionId,
      companyId: actor.companyId,
      actorId: actor.userId,
    });
    const status =
      result.code === "ran" || result.code === "already_active"
        ? 200
        : result.code === "not_found"
          ? 404
          : result.code === "forbidden"
            ? 403
            : result.code === "conflict"
              ? 409
              : result.code === "unsupported"
                ? 422
                : result.code === "storage_unavailable"
                  ? 503
                  : 500;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ code: "run_failed" }, { status: 500 });
  }
}
