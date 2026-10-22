import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

const { runGrokProviderTests } = importTs("../src/services/ai/grokProvider.test.ts");
await runGrokProviderTests();
console.log("grok provider tests passed");
