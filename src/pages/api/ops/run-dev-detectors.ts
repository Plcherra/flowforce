import { VercelRequest, VercelResponse } from "@vercel/node";
import { runDevAutoPlan } from "@/server/ops/dev-detectors/devAutoPlanBuilder";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const orgId = (req.query.orgId as string) || "000";
  await runDevAutoPlan(orgId);
  res.status(200).json({ success: true });
}
