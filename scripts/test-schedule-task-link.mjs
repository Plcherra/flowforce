import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  jsx: true,
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runScheduleTaskLinkTests } = importTs(
  "../src/features/tasks/utils/scheduleTaskLink.test.ts",
);
const { runDoneTabTests } = importTs(
  "../src/features/tasks/utils/statusTabs.test.ts",
);
const { runScheduleTaskSyncTests } = importTs(
  "../src/features/tasks/repositories/scheduleTaskSync.test.ts",
);
const { runTimeOffPolicyTests } = importTs(
  "../src/features/scheduling/utils/timeOffPolicy.test.ts",
);
const { runCompanyPolicyTests } = importTs(
  "../src/features/scheduling/utils/companyPolicy.test.ts",
);

runScheduleTaskLinkTests();
runDoneTabTests();
runScheduleTaskSyncTests();
runTimeOffPolicyTests();
runCompanyPolicyTests();
console.log("scheduleTaskLink tests passed");
