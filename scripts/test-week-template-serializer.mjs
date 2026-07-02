import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runWeekTemplateSerializerTests } = importTs(
  "../src/features/scheduling/utils/weekTemplateSerializer.test.ts",
);

runWeekTemplateSerializerTests();
console.log("weekTemplateSerializer tests passed");
