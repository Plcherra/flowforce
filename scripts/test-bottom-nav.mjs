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

const { runBottomNavDestinationTests } = importTs(
  "../src/app-shell/navigation/bottomNav/bottomNavDestinations.test.ts",
);
const { runDirectoryToolsTests } = importTs(
  "../src/features/employees/utils/directoryTools.test.ts",
);

runBottomNavDestinationTests();
runDirectoryToolsTests();
console.log("bottom nav destination tests passed");
