import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../_server/supabaseAdmin"; // pragma: allowlist secret
import { remapPlaceholderReferences } from "../../_server/storeReferences";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ message: "Missing authenticated session." }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(token); // pragma: allowlist secret
  if (error || !data.user) return NextResponse.json({ message: "Unable to verify session." }, { status: 401 });
  const { data: profile } = await supabaseAdmin // pragma: allowlist secret
    .from("profiles")
    .select("company_id, role")
    .eq("id", data.user.id)
    .maybeSingle();
  const companyId = typeof profile?.company_id === "string" ? profile.company_id : "";
  const role = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  if (!companyId || !["owner", "admin", "company_admin"].includes(role)) {
    return NextResponse.json({ message: "Unable to update stores." }, { status: 403 });
  }
  await remapPlaceholderReferences(supabaseAdmin, companyId); // pragma: allowlist secret
  return NextResponse.json({ ok: true });
}
