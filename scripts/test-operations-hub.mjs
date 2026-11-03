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

const { runOperationsHubMetricTests } = importTs(
  "../src/features/operations/utils/operationsHubMetrics.test.ts",
);
const { runAutomationRunnerTests } = importTs(
  "../src/server/automation/automationRunner.test.ts",
);

await runOperationsHubMetricTests();
await runAutomationRunnerTests();
console.log("operations hub metrics tests passed");
