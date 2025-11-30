import { issueToTask } from "./issueToTaskMapper";
import { upsertAutoTasks } from "../../task/upsertAutoTasks";

import { runCoverageDetector } from "./scheduling/coverageDetector";
import { runAvailabilityDetector } from "./scheduling/availabilityDetector";
import { runOvertimeDetector } from "./scheduling/overtimeDetector";
import { runTimeOffRiskDetector } from "./scheduling/timeOffRiskDetector";

export async function generateAutoPlanForOrg(orgId: string) {
  const issues = [
    ...(await runCoverageDetector(orgId)),
    ...(await runAvailabilityDetector(orgId)),
    ...(await runOvertimeDetector(orgId)),
    ...(await runTimeOffRiskDetector(orgId)),
  ];

  const tasks = issues.map(issueToTask);

  await upsertAutoTasks(orgId, tasks);
  return { issues, tasks };
}
