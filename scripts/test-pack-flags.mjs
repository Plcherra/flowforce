import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runPackFlagTests } = importTs("../src/config/packFlags.test.ts");
const { runPackCatalogTests } = importTs("../src/config/packCatalog.test.ts");

runPackFlagTests();
runPackCatalogTests();
console.log("pack flag tests passed");
