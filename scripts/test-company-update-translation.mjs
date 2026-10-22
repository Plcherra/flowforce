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
  const { runCompanyUpdateTranslationTests } = importTs(
    "../src/features/company-updates/companyUpdateTranslation.test.ts",
  );
  const { runTranslateContentTests } = importTs(
    "../src/server/i18n/translateContent.test.ts",
  );
  const { runCompanyUpdateCommentTranslationTests } = importTs(
    "../src/features/company-updates/companyUpdateCommentTranslation.test.ts",
  );
  const { runTranslatedTextTests } = importTs(
    "../src/features/i18n/translatedText.test.ts",
  );
  await runCompanyUpdateTranslationTests();
  await runCompanyUpdateCommentTranslationTests();
  await runTranslateContentTests();
  runTranslatedTextTests();
  console.log("company update translation tests passed");
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
