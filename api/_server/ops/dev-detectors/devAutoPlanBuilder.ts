import { issueToTask } from "../detectors/issueToTaskMapper";
import { upsertAutoTasks } from "../../task/upsertAutoTasks";

import { missingFileDetector } from "./missingFileDetector";
import { incompleteFeatureDetector } from "./incompleteFeatureDetector";
import { missingLogicDetector } from "./missingLogicDetector";
import { missingModuleDetector } from "./missingModuleDetector";
import { missingPageDetector } from "./missingPageDetector";
import { schemaMismatchDetector } from "./schemaMismatchDetector";

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
