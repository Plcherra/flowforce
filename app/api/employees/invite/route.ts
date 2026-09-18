import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";
import {
  applyInviteAccessToUser,
  clampInviteOverrides,
  loadInviteableClass,
  loadInviterGrantContext,
  type InviterGrantContext,
} from "../../_server/inviteAccess";
import { maxInvitableProductLevel } from "@/features/roles/constants/grantCeiling";
import {
  AUDIT_ACTIONS,
  getAuditEventMetadata,
} from "@/services/audit/auditEvents";
import { profileRoleFromClass } from "@/features/roles/constants/productLevels";

type InvitePersonBody = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  role?: unknown;
  roleId?: unknown;
  permissionOverrides?: unknown;
  locationId?: unknown;
  departmentId?: unknown;
};

type InviteRequestBody = InvitePersonBody & {
  invites?: InvitePersonBody[];
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

const getRequestOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return request.nextUrl.origin;
};

const readOverrides = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

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
    const people = Array.isArray(body.invites) ? body.invites : [body];

    if (people.length === 0) {
      return jsonError("Add at least one person to invite.");
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

    const inviter = await loadInviterGrantContext({
      companyId,
      actorId: actor.id,
    });
    if (!maxInvitableProductLevel(inviter.level, inviter.policy)) {
      return jsonError("You do not have permission to invite teammates.", 403);
    }

    const origin = getRequestOrigin(request);
    const results = [];

    for (const person of people) {
      const result = await sendPersonInvite({
        person,
        companyId,
        actorId: actor.id,
        inviter,
        origin,
        requestId,
      });
      results.push(result);
    }

    const first = results[0];
    return NextResponse.json({
      ok: results.every((result) => result.ok),
      inviteId: first?.inviteId ?? null,
      inviteToken: first?.inviteToken ?? null,
      inviteLink: first?.inviteLink ?? null,
      results,
    });
  } catch (error) {
    scopedLogger.error("Unexpected employee invite error", { error });
    return jsonError("Unexpected employee invite error.", 500);
  }
}

async function sendPersonInvite({
  person,
  companyId,
  actorId,
  inviter,
  origin,
  requestId,
}: {
  person: InvitePersonBody;
  companyId: string;
  actorId: string;
  inviter: InviterGrantContext;
  origin: string;
  requestId: string;
}) {
  const email = readString(person.email).toLowerCase();
  const firstName = readString(person.firstName);
  const lastName = readString(person.lastName);
  const phone = readString(person.phone) || null;
  const requestedRoleId = readString(person.roleId) || null;
  const requestedRoleKey = readString(person.role);
  const departmentId = readString(person.departmentId) || null;

  if (!email && !phone) {
    return {
      ok: false,
      email: email || null,
      message: "Add an email or phone number.",
    };
  }

  const role = await loadInviteableClass({
    companyId,
    roleId: requestedRoleId,
    roleKey: requestedRoleKey || "staff",
    inviterLevel: inviter.level,
    policy: inviter.policy,
  });

  if (!role) {
    return {
      ok: false,
      email: email || null,
      message: "Choose a class you can grant.",
    };
  }

  const permissionOverrides = clampInviteOverrides(
    role,
    readOverrides(person.permissionOverrides),
    inviter,
  );
  const roleKey = profileRoleFromClass(role);

  let existingQuery = supabaseAdmin
    .from("company_invites")
    .select("id, invite_token")
    .eq("company_id", companyId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  existingQuery = email
    ? existingQuery.eq("email", email)
    : existingQuery.eq("phone", phone);

  const { data: existingInvite } = await existingQuery.maybeSingle();

  const inviteToken =
    typeof existingInvite?.invite_token === "string" &&
    existingInvite.invite_token.length > 0
      ? existingInvite.invite_token
      : randomBytes(24).toString("hex");

  const invitePayload = {
    company_id: companyId,
    email: email || null,
    first_name: firstName || null,
    last_name: lastName || null,
    phone,
    role: roleKey,
    role_id: role.id,
    permission_overrides: permissionOverrides,
    department_id: departmentId,
    invite_token: inviteToken,
    invited_by: actorId,
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
    logger.error("Unable to record company invite", {
      error: inviteMutation.error,
      context: { companyId, email },
    });
    return {
      ok: false,
      email: email || null,
      message: "Unable to record company invite.",
    };
  }

  const inviteId = inviteMutation.data.id as string;
  const inviteLink = `${origin}/auth?invite=${inviteToken}`;
  let emailed = false;
  let invitedUserId: string | null = null;

  if (email) {
    const { data: inviteUser, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: roleKey,
          role_id: role.id,
          company_id: companyId,
          invite_id: inviteId,
          invite_token: inviteToken,
        },
        redirectTo: inviteLink,
      });

    if (inviteError) {
      await supabaseAdmin
        .from("company_invites")
        .update({ status: "email_failed" })
        .eq("id", inviteId);

      await writeInviteAudit({
        actorId,
        companyId,
        inviteId,
        email,
        action: AUDIT_ACTIONS.employeeInviteEmailFailed,
        metadata: {
          requestId,
          role: roleKey,
          roleId: role.id,
          message: inviteError.message,
        },
      });

      return {
        ok: false,
        email,
        inviteId,
        inviteToken,
        inviteLink,
        message: "Unable to send invite email.",
      };
    }

    emailed = true;
    invitedUserId = inviteUser.user?.id ?? null;
  }

  if (invitedUserId) {
    try {
      await applyInviteAccessToUser({
        userId: invitedUserId,
        companyId,
        actorId,
        email: email || null,
        firstName,
        lastName,
        phone,
        role,
        permissionOverrides,
        departmentId,
      });
    } catch (error) {
      logger.warn("Invite recorded, but access diffs were not applied yet", {
        error,
        context: { companyId, inviteId, invitedUserId },
      });
    }
  }

  await writeInviteAudit({
    actorId,
    companyId,
    inviteId,
    email: email || phone || "",
    action: AUDIT_ACTIONS.employeeInviteCreated,
    metadata: {
      requestId,
      role: roleKey,
      roleId: role.id,
      emailed,
    },
  });

  return {
    ok: true,
    email: email || null,
    inviteId,
    inviteToken,
    inviteLink,
    emailed,
  };
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
