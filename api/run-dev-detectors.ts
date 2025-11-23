import { runDevAutoPlan } from "../src/server/ops/dev-detectors/devAutoPlanBuilder";

export default async function handler(req: any, res: any) {
  try {
    const orgId = (req.query?.orgId as string) || "000";
    await runDevAutoPlan(orgId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Dev detector error:", err);
    return res.status(500).json({ error: String(err) });
  }
}
