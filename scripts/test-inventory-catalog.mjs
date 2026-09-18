import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const {
  runInventoryCatalogHonestyTests,
  runInventoryCountHonestyTests,
} = importTs("../src/features/inventory/utils/catalogHonesty.test.ts");

runInventoryCatalogHonestyTests();
runInventoryCountHonestyTests();
console.log("inventory catalog honesty tests passed");
console.log("inventory count honesty tests passed");
