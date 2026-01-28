import type { DetectorIssue } from "../detectors/types";

export async function incompleteFeatureDetector(
  _orgId?: string,
): Promise<DetectorIssue[]> {
  return [];
}
