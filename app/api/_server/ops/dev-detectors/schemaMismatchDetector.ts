import type { DetectorIssue } from "../detectors/types";

export async function schemaMismatchDetector(
  _orgId?: string,
): Promise<DetectorIssue[]> {
  return [];
}
