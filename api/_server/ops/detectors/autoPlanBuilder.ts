import { issueToTask } from "./issueToTaskMapper.js";
import { upsertAutoTasks } from "../../task/upsertAutoTasks.js";

import { runCoverageDetector } from "./scheduling/coverageDetector.js";
import { runAvailabilityDetector } from "./scheduling/availabilityDetector.js";
import { runOvertimeDetector } from "./scheduling/overtimeDetector.js";
import { runTimeOffRiskDetector } from "./scheduling/timeOffRiskDetector.js";

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
