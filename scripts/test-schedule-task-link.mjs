import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runScheduleTaskLinkTests } = importTs(
  "../src/features/tasks/utils/scheduleTaskLink.test.ts",
);

runScheduleTaskLinkTests();
console.log("scheduleTaskLink tests passed");
