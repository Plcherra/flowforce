import type { NextRequest } from "next/server";
import { supabaseAdmin } from "../../../app/api/_server/supabaseAdmin";

const BILLING_ADMIN_ROLES = new Set(["owner", "admin", "company_admin"]);

export type BillingAuthContext = {
  userId: string;
  companyId: string;
  role: string;
  email: string | null;
};

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
};

export async function requireBillingAuth(
  request: NextRequest,
): Promise<
  | { ok: true; context: BillingAuthContext }
  | { ok: false; status: number; message: string }
> {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, message: "Missing authenticated session." };
  }

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userResult?.user) {
    return { ok: false, status: 401, message: "Unable to verify session." };
  }

  const actor = userResult.user;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", actor.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 500,
      message: "Unable to verify billing permissions.",
    };
  }

  const companyId =
    typeof profile?.company_id === "string" ? profile.company_id : null;
  const role =
    typeof profile?.role === "string" ? profile.role.toLowerCase() : "";

  if (!companyId) {
    return {
      ok: false,
      status: 403,
      message: "No company context available for billing.",
    };
  }

  if (!BILLING_ADMIN_ROLES.has(role)) {
    return {
      ok: false,
      status: 403,
      message: "You do not have permission to manage billing.",
    };
  }

  return {
    ok: true,
    context: {
      userId: actor.id,
      companyId,
      role,
      email: actor.email ?? null,
    },
  };
}
