import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: { "@": path.join(rootDir, "..", "src") },
});

const { runEmployeeOnboardingModelTests } = importTs(
  "../src/features/employee-onboarding/model.test.ts",
);

runEmployeeOnboardingModelTests();
process.stdout.write("employee onboarding model tests passed\n");
