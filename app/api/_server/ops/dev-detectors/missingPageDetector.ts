import type { DetectorIssue } from "../detectors/types";

export async function missingPageDetector(
  _orgId?: string,
): Promise<DetectorIssue[]> {
  return [];
}
