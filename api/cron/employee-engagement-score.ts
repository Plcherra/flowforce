import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../_server/supabaseAdmin.js";
import { createServerLogger } from "../_server/utils/logger.js";
import { verifyCronRequest } from "../../lib/cron/verifyCron.js";

const loggerScope = "cron-employee-engagement-score";

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const logger = createServerLogger(loggerScope, { requestId, tags: ["cron", "engagement"] });
  const auth = verifyCronRequest(req.headers);

  if (!auth.ok) {
    logger.warn("Cron authentication failed", { context: { reason: auth.reason } });
    return res.status(401).json({ error: "unauthorized" });
  }

  const now = new Date();
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);

  logger.info("Engagement score run started", {
    context: { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
  });

  try {
    const periodStartIso = periodStart.toISOString();
    const periodEndIso = periodEnd.toISOString();

    const [recognitionCount, checklistCompletions, scheduledShifts, completedShifts] = await Promise.all([
      safeCount(
        "recognition_events",
        (query) => query.gte("earned_at", periodStartIso).lt("earned_at", periodEndIso),
        logger,
        "recognitions",
      ),
      safeCount(
        "tasks",
        (query) =>
          query
            .eq("status", "completed")
            .gte("completed_at", periodStartIso)
            .lt("completed_at", periodEndIso),
        logger,
        "checklist_completions",
      ),
      safeCount(
        "schedules",
        (query) =>
          query
            .eq("schedule_type", "shift")
            .gte("start_time", periodStartIso)
            .lt("start_time", periodEndIso),
        logger,
        "scheduled_shifts",
      ),
      safeCount(
        "schedules",
        (query) =>
          query
            .eq("schedule_type", "shift")
            .eq("status", "completed")
            .gte("start_time", periodStartIso)
            .lt("start_time", periodEndIso),
        logger,
        "completed_shifts",
      ),
    ]);

    const punctualityScore = scheduledShifts > 0 ? Math.round((completedShifts / scheduledShifts) * 100) : 100;
    const recognitionScore = Math.min(100, recognitionCount * 10);
    const checklistScore = Math.min(100, checklistCompletions * 5);
    const engagementScore = Math.round(recognitionScore * 0.35 + checklistScore * 0.35 + punctualityScore * 0.3);

    const payload = {
      period_start: periodStartIso,
      period_end: periodEndIso,
      recognition_count: recognitionCount,
      checklist_completions: checklistCompletions,
      punctuality_score: punctualityScore,
      engagement_score: engagementScore,
      calculated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("engagement_scores").insert(payload);

    if (error) {
      logger.error("Failed to persist engagement score", { error, context: payload });
      throw error;
    }

    logger.info("Engagement score run finished", {
      context: {
        engagementScore,
        recognitionCount,
        checklistCompletions,
        punctualityScore,
      },
    });

    return res.status(200).json({
      ok: true,
      engagementScore,
      recognitionCount,
      checklistCompletions,
      punctualityScore,
      periodStart: periodStartIso,
      periodEnd: periodEndIso,
    });
  } catch (error) {
    logger.error("Engagement score cron failed", { error });
    return res.status(500).json({ error: "engagement_score_failed" });
  }
}

async function safeCount(
  table: string,
  applyFilters: (query: any) => any,
  logger: ReturnType<typeof createServerLogger>,
  metricName: string,
): Promise<number> {
  try {
    const { count, error } = await applyFilters(
      supabaseAdmin.from(table).select("id", { count: "exact", head: true }),
    );

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    logger.warn("Count query failed", { error, context: { table, metricName } });
    return 0;
  }
}
