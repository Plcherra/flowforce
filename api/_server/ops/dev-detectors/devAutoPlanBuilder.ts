import { issueToTask } from "../detectors/issueToTaskMapper.js";
import { upsertAutoTasks } from "../../task/upsertAutoTasks.js";

import { missingFileDetector } from "./missingFileDetector.js";
import { incompleteFeatureDetector } from "./incompleteFeatureDetector.js";
import { missingLogicDetector } from "./missingLogicDetector.js";
import { missingModuleDetector } from "./missingModuleDetector.js";
import { missingPageDetector } from "./missingPageDetector.js";
import { schemaMismatchDetector } from "./schemaMismatchDetector.js";

export async function runDevAutoPlan(orgId: string) {
  const issues = [
    ...(await missingFileDetector(orgId)),
    ...(await incompleteFeatureDetector(orgId)),
    ...(await missingLogicDetector(orgId)),
    ...(await missingModuleDetector(orgId)),
    ...(await missingPageDetector(orgId)),
    ...(await schemaMismatchDetector(orgId)),
  ];

  const normalizedIssues = issues.map((issue) => ({
    ...issue,
    orgId: issue.orgId ?? orgId,
  }));

  const tasks = normalizedIssues.map(issueToTask).map((task) => ({
    ...task,
    generated_by: "dev_auto_plan",
  }));

  await upsertAutoTasks(orgId, tasks);

  return { issues: normalizedIssues, tasks };
}
