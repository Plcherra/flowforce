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

const { runStatusTabLayoutTests } = importTs(
  "../src/features/tasks/utils/statusTabLayout.test.ts",
);
const { runStatusHintTests } = importTs(
  "../src/features/tasks/utils/statusHint.test.ts",
);
const { runReadinessFilterTests } = importTs(
  "../src/features/tasks/utils/readinessFilters.test.ts",
);
const { runTaskKindTests } = importTs(
  "../src/features/tasks/utils/taskKind.test.ts",
);
const { runTaskCreateLevelTests } = importTs(
  "../src/features/tasks/utils/taskCreateLevel.test.ts",
);
const { runHandoverTaskTests } = importTs(
  "../src/features/forms/utils/handoverTask.test.ts",
);
const { runTaskScheduleTests } = importTs(
  "../src/features/tasks/utils/taskSchedule.test.ts",
);

runStatusTabLayoutTests();
runStatusHintTests();
runReadinessFilterTests();
runTaskKindTests();
runTaskCreateLevelTests();
runHandoverTaskTests();
runTaskScheduleTests();
console.log("tasks page tests passed");
