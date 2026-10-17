import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../../_server/supabaseAdmin";
import { createServerLogger } from "../../../_server/utils/logger";
import { applyInviteAccessByToken } from "../../../_server/inviteAccess";

const logger = createServerLogger("employees-invite-activate");

const readString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const jsonError = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ message, details }, { status });

async function findAuthUserIdByEmail(email: string) {
  const normalized = email.toLowerCase();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .ilike("email", normalized)
    .maybeSingle();

  if (profile?.id) return profile.id as string;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );
    if (match?.id) return match.id;
    if (data.users.length < 200) break;
  }

  return null;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const scopedLogger = logger.child({ requestId });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      inviteToken?: unknown;
      password?: unknown;
    };
    const inviteToken = readString(body.inviteToken);
    const password = readString(body.password);

    if (!inviteToken) {
      return jsonError("Invite token is required.");
    }
    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters.");
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("company_invites")
      .select("id, email, expires_at, accepted_at, status")
      .eq("invite_token", inviteToken)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite?.id || !invite.email) {
      return jsonError("This invitation is invalid or has expired.", 404);
    }
    if (invite.accepted_at || invite.status === "accepted") {
      return jsonError("This invitation has already been used.", 409);
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return jsonError("This invitation has expired.", 410);
    }

    const email = invite.email.toLowerCase();
    let userId = await findAuthUserIdByEmail(email);

    if (userId) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password, email_confirm: true },
      );
      if (updateError) throw updateError;
    } else {
      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
      if (createError || !created.user?.id) throw createError ?? new Error("Unable to create invited user.");
      userId = created.user.id;
    }

    const inviteId = await applyInviteAccessByToken({
      userId,
      email,
      inviteToken,
    });

    if (!inviteId) {
      return jsonError("This invitation could not be applied.", 404);
    }

    return NextResponse.json({ ok: true, email, inviteId });
  } catch (error) {
    scopedLogger.error("Unexpected invite activation error", { error });
    const message = error instanceof Error ? error.message : "Unable to activate this invite.";
    return jsonError(message, 500);
  }
}
