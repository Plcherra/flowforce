import { NextRequest, NextResponse } from "next/server";
import { authorizeRemoteLog } from "./authorizeRemoteLog";
import { readBearerToken } from "../onboarding/complete/authorizeOnboarding";
import { supabaseAdmin } from "../_server/supabaseAdmin"; // pragma: allowlist secret

const MAX_LOG_BYTES = 64 * 1024;
const VALID_LEVELS = new Set(["debug", "info", "warn", "error"]);
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function normalizeLevel(value: unknown) {
  return typeof value === "string" && VALID_LEVELS.has(value) ? value : "info";
}

function normalizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.slice(0, 2_000);
}

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;
  return UUID_REGEX.test(value) ? value : null;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.slice(0, 80))
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function normalizeContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return { note: "unable_to_serialize_remote_log_context" };
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_LOG_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const bearerToken = readBearerToken(request.headers.get("authorization"));
  let sessionUserId: string | null = null;
  let bearerVerified = false;

  if (bearerToken) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken); // pragma: allowlist secret
    if (!error && data.user?.id) {
      bearerVerified = true;
      sessionUserId = data.user.id;
    }
  }

  const payloadForAuth = await request.clone().json().catch(() => null);
  const bodyUserId =
    payloadForAuth &&
    typeof payloadForAuth === "object" &&
    typeof (payloadForAuth as { userId?: unknown }).userId === "string"
      ? (payloadForAuth as { userId: string }).userId
      : null;

  const decision = authorizeRemoteLog({
    configuredToken: process.env.LOG_INGEST_TOKEN,
    providedToken: request.headers.get("x-log-token"),
    bearerToken,
    sessionUserId,
    bearerVerified,
    bodyUserId,
  });

  if (decision.ok === false) {
    return NextResponse.json({ error: decision.message }, { status: decision.status });
  }

  const payload = payloadForAuth;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const message = normalizeText(body.message, "Remote client log");

  const { error } = await supabaseAdmin.from("system_logs").insert({ // pragma: allowlist secret
    level: normalizeLevel(body.level),
    message,
    location: normalizeText(body.location, "client"),
    requestid: normalizeText(body.requestId),
    org_id: normalizeUuid(body.orgId),
    user_id: normalizeUuid(decision.userId),
    context: normalizeContext(body.context),
    stack: normalizeText(body.stack),
    tags: normalizeTags(body.tags),
  });

  if (error) {
    console.error("[logs] failed to persist remote log", {
      code: error.code,
      message: error.message,
    });

    return NextResponse.json(
      { ok: true, persisted: false },
      { status: 202 },
    );
  }

  return NextResponse.json({ ok: true, persisted: true }, { status: 202 });
}
