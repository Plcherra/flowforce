import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyManagedUserAccess } from "../../_server/inviteAccess";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";

const logger = createServerLogger("employees-access");

const jsonError = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ message, details }, { status });

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const scopedLogger = logger.child({ requestId });

  try {
    const token = getBearerToken(request);
    if (!token) {
      return jsonError("Missing authenticated session.", 401);
    }

    const { data: userResult, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userResult?.user) {
      return jsonError("Unable to verify session.", 401, userError);
    }

    const actor = userResult.user;
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      roleId?: unknown;
      permissionOverrides?: unknown;
    };

    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const roleId = typeof body.roleId === "string" ? body.roleId.trim() : "";
    if (!userId) {
      return jsonError("Choose a person to update.");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id")
      .eq("id", actor.id)
      .maybeSingle();

    if (profileError) {
      scopedLogger.error("Unable to load access actor profile", {
        error: profileError,
        context: { userId: actor.id },
      });
      return jsonError("Unable to verify access permissions.", 500);
    }

    const companyId =
      typeof profile?.company_id === "string" ? profile.company_id : null;
    if (!companyId) {
      return jsonError("No company context available.", 403);
    }

    const result = await applyManagedUserAccess({
      companyId,
      actorId: actor.id,
      userId,
      roleId: roleId || null,
      permissionOverrides:
        body.permissionOverrides &&
        typeof body.permissionOverrides === "object" &&
        !Array.isArray(body.permissionOverrides)
          ? (body.permissionOverrides as Record<string, unknown>)
          : undefined,
      replaceOverrides: body.permissionOverrides !== undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Unable to save access.";
    if (status >= 500) {
      scopedLogger.error("Unexpected employee access error", { error });
    }
    return jsonError(message, Number.isFinite(status) && status > 0 ? status : 500);
  }
}
