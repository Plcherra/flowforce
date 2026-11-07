import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runServiceRoleAuthTests } = importTs(
  "../app/api/onboarding/complete/authorizeOnboarding.test.ts",
);

await runServiceRoleAuthTests();
console.log("service role auth tests passed");
