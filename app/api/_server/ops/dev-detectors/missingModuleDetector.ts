import type { DetectorIssue } from "../detectors/types";

export async function missingModuleDetector(
  _orgId?: string,
): Promise<DetectorIssue[]> {
  return [];
}
