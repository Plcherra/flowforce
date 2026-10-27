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
  const { runThreadReplyTests } = importTs(
    "../src/features/messages/threadReplies.test.ts",
  );
  runThreadReplyTests();
  console.log("thread reply tests passed");
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
