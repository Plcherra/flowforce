import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const importTs = jiti(import.meta.url, {
  alias: {
    "@": path.join(rootDir, "..", "src"),
  },
});

try {
  const { runTaskContentTranslationTests } = importTs(
    "../src/features/tasks/taskContentTranslation.test.ts",
  );
  await runTaskContentTranslationTests();
  console.log("task content translation tests passed");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const shortStack = stack
    .split("\n")
    .filter((line) => !line.includes("jiti.cjs"))
    .slice(0, 30)
    .join("\n");
  process.stderr.write(`${message.slice(0, 2000)}\n${shortStack.slice(0, 2000)}\n`);
  process.exit(1);
}
