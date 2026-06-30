import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";
import {
  AUDIT_ACTIONS,
  getAuditEventMetadata,
} from "@/services/audit/auditEvents";

type InviteRequestBody = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  role?: unknown;
  roleId?: unknown;
};

const logger = createServerLogger("employees-invite");
const INVITE_ROLES = new Set(["owner", "admin", "company_admin", "manager"]);

const readString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const jsonError = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ message, details }, { status });

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
};

const normalizeRole = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return [
    "admin",
    "manager",
    "employee",
    "staff",
    "supervisor",
    "owner",
  ].includes(normalized)
    ? normalized
    : "staff";
};

const getRequestOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return request.nextUrl.origin;
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
    const body = (await request.json().catch(() => ({}))) as InviteRequestBody;
    const email = readString(body.email).toLowerCase();
    const firstName = readString(body.firstName);
    const lastName = readString(body.lastName);
    const role = normalizeRole(readString(body.role) || "staff");
    const roleId = readString(body.roleId) || null;

    if (!email) {
      return jsonError("Email is required.");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, role")
      .eq("id", actor.id)
      .maybeSingle();

    if (profileError) {
      scopedLogger.error("Unable to load invite actor profile", {
        error: profileError,
        context: { userId: actor.id },
      });
      return jsonError("Unable to verify invite permissions.", 500);
    }

    const companyId =
      typeof profile?.company_id === "string" ? profile.company_id : null;
    const actorRole =
      typeof profile?.role === "string" ? profile.role.toLowerCase() : "";

    if (!companyId) {
      return jsonError("No company context available for invite.", 403);
    }

    if (!INVITE_ROLES.has(actorRole)) {
      return jsonError("You do not have permission to invite teammates.", 403);
    }

    const { data: existingInvite } = await supabaseAdmin
      .from("company_invites")
      .select("id, invite_token")
      .eq("company_id", companyId)
      .eq("email", email)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const inviteToken =
      typeof existingInvite?.invite_token === "string" &&
      existingInvite.invite_token.length > 0
        ? existingInvite.invite_token
        : randomBytes(24).toString("hex");

    const invitePayload = {
      company_id: companyId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      role,
      invite_token: inviteToken,
      invited_by: actor.id,
      status: "pending",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const inviteMutation = existingInvite?.id
      ? await supabaseAdmin
          .from("company_invites")
          .update(invitePayload)
          .eq("id", existingInvite.id)
          .select("id")
          .single()
      : await supabaseAdmin
          .from("company_invites")
          .insert(invitePayload)
          .select("id")
          .single();

    if (inviteMutation.error || !inviteMutation.data?.id) {
      scopedLogger.error("Unable to record company invite", {
        error: inviteMutation.error,
        context: { companyId, email },
      });
      return jsonError("Unable to record company invite.", 500);
    }

    const inviteId = inviteMutation.data.id as string;
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          role_id: roleId,
          company_id: companyId,
          invite_id: inviteId,
          invite_token: inviteToken,
        },
        redirectTo: `${getRequestOrigin(request)}/auth?invite=${inviteToken}`,
      });

    if (inviteError) {
      await supabaseAdmin
        .from("company_invites")
        .update({ status: "email_failed" })
        .eq("id", inviteId);

      await writeInviteAudit({
        actorId: actor.id,
        companyId,
        inviteId,
        email,
        action: AUDIT_ACTIONS.employeeInviteEmailFailed,
        metadata: { requestId, role, roleId, message: inviteError.message },
      });

      scopedLogger.error("Unable to send Supabase invite email", {
        error: inviteError,
        context: { companyId, inviteId, email },
      });
      return jsonError("Unable to send invite email.", 502, inviteError);
    }

    await writeInviteAudit({
      actorId: actor.id,
      companyId,
      inviteId,
      email,
      action: AUDIT_ACTIONS.employeeInviteCreated,
      metadata: { requestId, role, roleId },
    });

    return NextResponse.json({ ok: true, inviteId });
  } catch (error) {
    scopedLogger.error("Unexpected employee invite error", { error });
    return jsonError("Unexpected employee invite error.", 500);
  }
}

async function writeInviteAudit({
  actorId,
  companyId,
  inviteId,
  email,
  action,
  metadata,
}: {
  actorId: string;
  companyId: string;
  inviteId: string;
  email: string;
  action: string;
  metadata: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("audit_log").insert({
    action,
    actorid: actorId,
    company_id: companyId,
    table_name: "company_invites",
    recordid: inviteId,
    metadata: {
      ...getAuditEventMetadata(action),
      ...metadata,
      email,
    },
  });

  if (error) {
    logger.warn("Unable to write invite audit log", {
      error,
      context: { companyId, inviteId },
    });
  }
}
