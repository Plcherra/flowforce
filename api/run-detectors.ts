import { randomUUID } from "node:crypto";
import { runKpiDetectors } from "./_server/ops/detectors/runKpiDetectors.js";
import { detectIssues } from "./_server/ops/issues/detectIssues.js";
import { supabaseAdmin } from "./_server/supabaseAdmin.js";
import { generateAutoPlanForOrg } from "./_server/ops/detectors/autoPlanBuilder.js";
import { createServerLogger } from "./_server/utils/logger.js";

export default async function handler(req: any, res: any) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const logger = createServerLogger("run-detectors", { requestId, tags: ["cron", "ops"] });

  try {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn("Unauthorized detector invocation attempted");
      return res.status(401).json({ error: "unauthorized" });
    }

    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id");

    if (error) {
      logger.error("Failed to load organizations", { error });
      throw error;
    }

    logger.info("Running detectors cron", { context: { orgCount: orgs.length } });

    let processed = 0;
    let failures = 0;

    for (const org of orgs) {
      const id = org.id;
      const orgLogger = logger.child({ orgId: id });

      orgLogger.info("Starting detectors for org");

      try {
        await runKpiDetectors({ orgId: id });
        await detectIssues({ orgId: id });
        await generateAutoPlanForOrg(id);
        processed += 1;
        orgLogger.info("Detectors completed");
      } catch (error) {
        failures += 1;
        orgLogger.error("Detector run failed", { error });
      }
    }

    logger.info("Detector cron finished", {
      context: { processed, failures, total: orgs.length },
    });

    return res.status(200).json({ ok: true, processed, failures, total: orgs.length });
  } catch (err) {
    logger.error("Detector cron error", { error: err });
    return res.status(500).json({ error: "Cron error", details: String(err) });
  }
}
