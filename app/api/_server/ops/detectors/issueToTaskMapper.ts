import { DetectorIssue } from "./types";

export function issueToTask(issue: DetectorIssue) {
  return {
    id: issue.id,
    orgId: issue.orgId,
    sourceIssueId: issue.id,
    type: issue.detector,
    title: issue.title,
    description: issue.message,
    severity: issue.severity,
    status: "open",
    generated_by: "auto_plan",
    metadata: issue.metadata ?? {},
    createdAt: new Date().toISOString()
  };
}
