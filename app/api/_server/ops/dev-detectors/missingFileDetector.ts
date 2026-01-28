import type { DetectorIssue } from "../detectors/types";

export async function missingFileDetector(
  _orgId?: string,
): Promise<DetectorIssue[]> {
  return [];
}
