import { randomUUID } from "node:crypto";
import { runDevAutoPlan } from "./_server/ops/dev-detectors/devAutoPlanBuilder.js";
import { createServerLogger } from "./_server/utils/logger.js";

export default async function handler(req: any, res: any) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const logger = createServerLogger("run-dev-detectors", { requestId, tags: ["cron", "dev"] });

  try {
    const orgId = (req.query?.orgId as string) || "000";
    const scoped = logger.child({ orgId });

    scoped.info("Starting dev auto-plan run");
    await runDevAutoPlan(orgId);
    scoped.info("Dev auto-plan run completed");
    res.status(200).json({ success: true, orgId });
  } catch (err) {
    logger.error("Dev detector error", { error: err });
    return res.status(500).json({ error: String(err) });
  }
}
