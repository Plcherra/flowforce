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

await runOperationsHubMetricTests();
console.log("operations hub metrics tests passed");
