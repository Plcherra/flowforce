import type { NextApiRequest, NextApiResponse } from "next";
import { runKpiDetectors } from "@/server/ops/detectors/runKpiDetectors";
import { detectIssues } from "@/server/ops/issues/detectIssues";
import { supabaseAdmin } from "@/server/supabase/admin"; // service role client

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch all organizations from your orgs table
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id");

    if (error) {
      console.error("Failed to load orgs:", error);
      return res.status(500).json({ error: "Failed to load organizations" });
    }

    for (const org of orgs) {
      const orgId = org.id;

      // Run all KPI detectors (tasks, inventory, labor)
      await runKpiDetectors(orgId);

      // Detect issues from snapshots
      await detectIssues(orgId);
    }

    return res.status(200).json({ ok: true, orgsProcessed: orgs.length });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: "Cron job failed", details: err });
  }
}