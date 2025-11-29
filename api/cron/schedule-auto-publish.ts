import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../_server/supabaseAdmin.js";
import { createServerLogger } from "../_server/utils/logger.js";
import { verifyCronRequest } from "../../lib/cron/verifyCron.js";

const loggerScope = "cron-schedule-auto-publish";

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const logger = createServerLogger(loggerScope, { requestId, tags: ["cron", "publish"] });
  const auth = verifyCronRequest(req.headers);

  if (!auth.ok) {
    logger.warn("Cron authentication failed", { context: { reason: auth.reason } });
    return res.status(401).json({ error: "unauthorized" });
  }

  const nowIso = new Date().toISOString();
  logger.info("Schedule auto-publish started", { context: { asOf: nowIso } });

  try {
    const publishedCount = await publishEligibleSchedules(nowIso, logger);

    logger.info("Schedule auto-publish finished", { context: { publishedCount } });
    return res.status(200).json({ ok: true, published: publishedCount, runAt: nowIso });
  } catch (error) {
    logger.error("Schedule auto-publish failed", { error });
    return res.status(500).json({ error: "schedule_auto_publish_failed" });
  }
}

async function publishEligibleSchedules(
  nowIso: string,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("work_schedules")
    .update({ status: "published", published_at: nowIso })
    .eq("status", "pending")
    .lte("publish_at", nowIso)
    .select("id");

  if (!error) {
    return data?.length ?? 0;
  }

  logger.warn("Schedule publish failed with published_at column, retrying status-only", {
    error,
    context: { runAt: nowIso },
  });

  const fallback = await supabaseAdmin
    .from("work_schedules")
    .update({ status: "published" })
    .eq("status", "pending")
    .lte("publish_at", nowIso)
    .select("id");

  if (fallback.error) {
    logger.error("Schedule publish fallback failed", { error: fallback.error, context: { runAt: nowIso } });
    throw fallback.error;
  }

  return fallback.data?.length ?? 0;
}
