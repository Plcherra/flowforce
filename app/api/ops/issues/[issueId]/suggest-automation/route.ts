import { NextRequest, NextResponse } from "next/server";
import { generateAutomationSuggestion } from "@/server/ops/suggestions/generateAutomationSuggestion";
import { supabaseAdmin } from "../../../../_server/supabaseAdmin";

type RouteContext = {
  params: Promise<{ issueId?: string }> | { issueId?: string };
};

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
};

const userCanAccessOrg = async (userId: string, orgId: string) => {
  const { count: membershipCount, error: membershipError } = await supabaseAdmin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", orgId)
    .eq("user_id", userId);

  if (!membershipError && (membershipCount ?? 0) > 0) {
    return true;
  }

  const { count: profileCount, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("id", userId)
    .eq("company_id", orgId);

  return !profileError && (profileCount ?? 0) > 0;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const issueId = params.issueId;
  const body = await request.json().catch(() => null);
  const orgId = body?.orgId;

  if (!issueId) {
    return NextResponse.json({ error: "Missing issueId" }, { status: 400 });
  }

  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userResult?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await userCanAccessOrg(userResult.user.id, orgId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await generateAutomationSuggestion({
      issueId,
      orgId,
      client: supabaseAdmin,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Automation failed",
      },
      { status: 500 },
    );
  }
}
