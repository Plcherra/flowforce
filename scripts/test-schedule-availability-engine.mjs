import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runScheduleAvailabilityEngineTests } = importTs(
  "../src/features/scheduling/services/availability/scheduleAvailabilityEngine.test.ts",
);
const { runCopilotSchedulerPlanTests } = importTs(
  "../src/features/scheduling/hooks/copilotSchedulerPlan.test.ts",
);
const { runScheduleReadinessTests } = importTs(
  "../src/features/scheduling/utils/scheduleReadiness.test.ts",
);
const { runRepeatPatternTests } = importTs(
  "../src/features/scheduling/utils/repeatPattern.test.ts",
);
const { runLeadershipLevelTests } = importTs(
  "../src/features/scheduling/utils/leadershipLevel.test.ts",
);
const { runScheduleGridGroupsTests } = importTs(
  "../src/features/scheduling/utils/scheduleGridGroups.test.ts",
);

runScheduleAvailabilityEngineTests();
console.log("scheduleAvailabilityEngine tests passed");
runCopilotSchedulerPlanTests();
console.log("copilotSchedulerPlan tests passed");
runScheduleReadinessTests();
console.log("scheduleReadiness tests passed");
runRepeatPatternTests();
console.log("repeatPattern tests passed");
runLeadershipLevelTests();
console.log("leadershipLevel tests passed");
runScheduleGridGroupsTests();
console.log("scheduleGridGroups tests passed");
