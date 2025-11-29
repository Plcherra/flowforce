import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../_server/supabaseAdmin.js";
import { createServerLogger } from "../_server/utils/logger.js";
import { verifyCronRequest } from "../../lib/cron/verifyCron.js";

const loggerScope = "cron-auto-cleanup-drafts";

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const logger = createServerLogger(loggerScope, { requestId, tags: ["cron", "cleanup"] });
  const auth = verifyCronRequest(req.headers);

  if (!auth.ok) {
    logger.warn("Cron authentication failed", { context: { reason: auth.reason } });
    return res.status(401).json({ error: "unauthorized" });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  logger.info("Draft cleanup started", { context: { cutoff: cutoffIso } });

  try {
    const deletedCount = await deleteDrafts(cutoffIso, logger);

    logger.info("Draft cleanup finished", { context: { deletedCount, cutoff: cutoffIso } });

    return res.status(200).json({ ok: true, deleted: deletedCount, cutoff: cutoffIso });
  } catch (error) {
    logger.error("Draft cleanup failed", { error });
    return res.status(500).json({ error: "draft_cleanup_failed" });
  }
}

async function deleteDrafts(
  cutoffIso: string,
  logger: ReturnType<typeof createServerLogger>,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("is_draft", true)
    .lte("created_at", cutoffIso)
    .select("id");

  if (!error) {
    return data?.length ?? 0;
  }

  logger.warn("Primary draft cleanup failed, attempting fallback", { error, context: { cutoff: cutoffIso } });

  const fallback = await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("status", "draft")
    .lte("created_at", cutoffIso)
    .select("id");

  if (fallback.error) {
    logger.error("Fallback draft cleanup failed", { error: fallback.error, context: { cutoff: cutoffIso } });
    throw fallback.error;
  }

  return fallback.data?.length ?? 0;
}
