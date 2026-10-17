import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../../_server/supabaseAdmin";
import { createServerLogger } from "../../../_server/utils/logger";

const logger = createServerLogger("employees-invite-preview");

const readString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ message }, { status });

const ACTIVATABLE_STATUSES = new Set(["pending", "email_failed"]);

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const scopedLogger = logger.child({ requestId });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      inviteToken?: unknown;
    };
    const inviteToken = readString(body.inviteToken);
    if (!inviteToken) {
      return jsonError("Invite token is required.");
    }

    const { data: invite, error } = await supabaseAdmin
      .from("company_invites")
      .select(
        "email, first_name, last_name, phone, birth_date, role, status, accepted_at, expires_at",
      )
      .eq("invite_token", inviteToken)
      .maybeSingle();

    if (error) throw error;
    if (!invite?.email) {
      return jsonError("This invitation is invalid or has expired.", 404);
    }
    if (invite.accepted_at || invite.status === "accepted") {
      return jsonError("This invitation has already been used.", 409);
    }
    if (invite.status && !ACTIVATABLE_STATUSES.has(invite.status)) {
      return jsonError("This invitation is invalid or has expired.", 404);
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return jsonError("This invitation has expired.", 410);
    }

    return NextResponse.json({
      email: invite.email,
      first_name: invite.first_name,
      last_name: invite.last_name,
      phone: invite.phone,
      birth_date: invite.birth_date,
      role: invite.role,
    });
  } catch (error) {
    scopedLogger.error("Unexpected invite preview error", { error });
    return jsonError("Unable to load this invitation.", 500);
  }
}
