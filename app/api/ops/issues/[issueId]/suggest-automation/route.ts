import { NextRequest, NextResponse } from "next/server";
import { generateAutomationSuggestion } from "@/server/ops/suggestions/generateAutomationSuggestion";

type RouteContext = {
  params: Promise<{ issueId?: string }> | { issueId?: string };
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

  try {
    const result = await generateAutomationSuggestion({ issueId, orgId });
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
