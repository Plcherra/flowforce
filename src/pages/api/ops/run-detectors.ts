import type { NextApiRequest, NextApiResponse } from "next";
import { runKpiDetectors } from "@/server/ops/detectors/runKpiDetectors";
import { detectIssues } from "@/server/ops/issues/detectIssues";
import { supabaseAdmin } from "@/server/supabase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Optional authentication:
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id");

    if (error) throw error;

    for (const org of orgs) {
      const id = org.id;
      await runKpiDetectors(id);
      await detectIssues(id);
    }

    return res.status(200).json({ ok: true, processed: orgs.length });
  } catch (err) {
    console.error("Cron failure:", err);
    return res.status(500).json({ error: "Cron error", details: String(err) });
  }
}