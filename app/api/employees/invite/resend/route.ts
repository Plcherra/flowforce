import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../_server/supabaseAdmin"; // pragma: allowlist secret
import { sendInviteEmail } from "../../../_server/inviteEmail";
import { loadInviteableClass } from "../../../_server/inviteAccess";

const INVITE_ROLES = new Set(["owner", "admin", "company_admin", "manager"]);

function bearer(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = bearer(request);
  if (!token) return NextResponse.json({ message: "Missing authenticated session." }, { status: 401 });

  const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token); // pragma: allowlist secret
  if (userError || !userResult.user) {
    return NextResponse.json({ message: "Unable to verify session." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ message: "Email is required." }, { status: 400 });

  const { data: profile } = await supabaseAdmin // pragma: allowlist secret
    .from("profiles")
    .select("company_id, role")
    .eq("id", userResult.user.id)
    .maybeSingle();
  const companyId = profile?.company_id ?? null;
  const actorRole = (profile?.role ?? "").toLowerCase();
  if (!companyId || !INVITE_ROLES.has(actorRole)) {
    return NextResponse.json({ message: "You do not have permission to invite teammates." }, { status: 403 });
  }

  const { data: invite } = await supabaseAdmin // pragma: allowlist secret
    .from("company_invites")
    .select("id, invite_token, first_name, last_name, role, role_id, store_id, hire_date")
    .eq("company_id", companyId)
    .eq("email", email)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invite?.id || !invite.invite_token || !invite.role_id) {
    return NextResponse.json({ message: "No open invite for that person." }, { status: 404 });
  }

  const role = await loadInviteableClass({
    companyId,
    roleId: invite.role_id,
    includeInactive: true,
  });
  if (!role) return NextResponse.json({ message: "That role is no longer available." }, { status: 404 });

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;
  const { error } = await sendInviteEmail({
    email,
    redirectTo: `${origin}/auth?invite=${invite.invite_token}`,
    firstName: invite.first_name ?? "",
    lastName: invite.last_name ?? "",
    roleKey: invite.role ?? role.product_level ?? "staff",
    roleId: role.id,
    roleName: role.name,
    companyId,
    inviteId: invite.id,
    inviteToken: invite.invite_token,
    storeId: invite.store_id,
    startDate: invite.hire_date ?? "",
  });

  if (error) return NextResponse.json({ message: "Unable to resend invite email." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
