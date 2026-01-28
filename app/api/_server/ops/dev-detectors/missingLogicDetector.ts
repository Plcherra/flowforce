import type { DetectorIssue } from "../detectors/types";

export async function missingLogicDetector(
  _orgId?: string,
): Promise<DetectorIssue[]> {
  return [];
}
