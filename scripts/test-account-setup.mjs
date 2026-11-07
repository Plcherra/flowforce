import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: { "@": path.join(rootDir, "..", "src") },
});

const { runAccountSetupModelTests } = importTs(
  "../src/features/onboarding/account/accountSetupModel.test.ts",
);
const { runStoreDraftTests } = importTs(
  "../src/features/stores/storeDraft.test.ts",
);
const { runOrgTemplateTests } = importTs(
  "../src/features/onboarding/utils/orgTemplates.test.ts",
);
const { runOverviewModelTests } = importTs(
  "../src/features/dashboard/overview/overviewModel.test.ts",
);

runOrgTemplateTests();
runStoreDraftTests();
runAccountSetupModelTests();
runOverviewModelTests();
process.stdout.write("account setup and overview model tests passed\n");
