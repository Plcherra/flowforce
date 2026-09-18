import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../../_server/supabaseAdmin";
import { createServerLogger } from "../../../_server/utils/logger";
import { applyInviteAccessByToken } from "../../../_server/inviteAccess";

const logger = createServerLogger("employees-invite-accept");

const readString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

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

    const body = (await request.json().catch(() => ({}))) as {
      inviteToken?: unknown;
    };
    const inviteToken = readString(body.inviteToken);
    if (!inviteToken) {
      return jsonError("Invite token is required.");
    }

    const inviteId = await applyInviteAccessByToken({
      userId: userResult.user.id,
      email: userResult.user.email ?? "",
      inviteToken,
    });

    if (!inviteId) {
      return jsonError("This invitation is invalid or has expired.", 404);
    }

    return NextResponse.json({ ok: true, inviteId });
  } catch (error) {
    scopedLogger.error("Unexpected invite accept error", { error });
    return jsonError("Unable to apply invite access.", 500);
  }
}
