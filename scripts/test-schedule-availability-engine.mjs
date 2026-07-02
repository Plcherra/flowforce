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

runScheduleAvailabilityEngineTests();
console.log("scheduleAvailabilityEngine tests passed");
