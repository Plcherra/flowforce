import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { draftTasksFromClosingNotes } from "@/features/tasks/utils/closingNoteDrafts";
import {
  createGrokChatCompletion,
  readGrokRuntimeConfig,
} from "@/services/ai/grokProvider";
import type { GrokMessage } from "@/services/ai/grokProvider";
import { supabaseAdmin } from "../../_server/supabaseAdmin";

export const dynamic = "force-dynamic";

function bearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export async function POST(request: NextRequest) {
  const token = bearer(request);
  if (!token) {
    return NextResponse.json({ message: "Missing authenticated session." }, { status: 401 });
  }
  const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userResult?.user) {
    return NextResponse.json({ message: "Unable to verify session." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notes?: unknown;
    area?: unknown;
    personId?: unknown;
  };
  const notes = Array.isArray(body.notes)
    ? body.notes.filter((note): note is string => typeof note === "string")
    : [];
  if (body.area !== "cashier" && body.area !== "supervisor") {
    return NextResponse.json({ message: "Choose cashier or supervisor." }, { status: 400 });
  }
  const personId = typeof body.personId === "string" && body.personId.trim() ? body.personId : null;

  try {
    const drafts = await draftTasksFromClosingNotes({
      notes,
      area: body.area,
      personId,
      model: async ({ body: chatBody }) => {
        const config = readGrokRuntimeConfig((name) => process.env[name]);
        const messages = Array.isArray(chatBody.messages)
          ? (chatBody.messages as GrokMessage[])
          : [];
        const result = await createGrokChatCompletion({
          apiKey: config.apiKey,
          model: config.model,
          messages,
          temperature: 0,
          responseFormat: { type: "json_object" },
        });
        return result.content;
      },
    });
    return NextResponse.json({ drafts, requestId: randomUUID() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to draft tasks.";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ message }, { status });
  }
}
