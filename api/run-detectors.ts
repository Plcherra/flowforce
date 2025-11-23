import { runKpiDetectors } from "../src/server/ops/detectors/runKpiDetectors";
import { detectIssues } from "../src/server/ops/issues/detectIssues";
import { supabaseAdmin } from "../src/server/supabaseAdmin";
import { generateAutoPlanForOrg } from "../src/server/ops/detectors/autoPlanBuilder";

export default async function handler(req: any, res: any) {
  try {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id");

    if (error) throw error;

    for (const org of orgs) {
      const id = org.id;

      await runKpiDetectors(id);
      await detectIssues(id);
      await generateAutoPlanForOrg(id);
    }

    return res.status(200).json({ ok: true, processed: orgs.length });
  } catch (err) {
    console.error("Detector error:", err);
    return res.status(500).json({ error: "Cron error", details: String(err) });
  }
}
