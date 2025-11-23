export type DetectorIssueSeverity = "info" | "warning" | "error";

export interface DetectorIssue {
  id: string;
  orgId: string;
  detector: string;
  title: string;
  message: string;
  severity: DetectorIssueSeverity;
  metadata?: Record<string, unknown>;
}
