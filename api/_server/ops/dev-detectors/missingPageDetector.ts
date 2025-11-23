import type { DetectorIssue } from "../detectors/types.js";

export async function missingPageDetector(orgId?: string): Promise<DetectorIssue[]> {
  return [];
}
