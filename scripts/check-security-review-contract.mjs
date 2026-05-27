import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fail = (message) => {
  throw new Error(`[security-review-contract] ${message}`);
};

const assertIncludes = (text, pattern, message) => {
  if (!text.includes(pattern)) fail(message);
};

const codeExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

const walk = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const relativePath = path
      .join(relativeDir, entry)
      .split(path.sep)
      .join("/");
    const absolutePath = path.join(root, relativePath);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") return [];
      return walk(relativePath);
    }

    if (!stat.isFile() || !codeExtensions.has(path.extname(entry))) return [];
    return [relativePath];
  });
};

const trackedEnv = execFileSync("git", ["ls-files", ".env"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (trackedEnv) {
  fail(".env must not be tracked by git");
}

const gitignore = readText(".gitignore");
assertIncludes(gitignore, ".env", ".gitignore must ignore .env");
assertIncludes(
  gitignore,
  "!.env.example",
  ".gitignore must keep .env.example tracked",
);

const forbiddenClientSecretPatterns = [
  "dangerouslyAllowBrowser",
  "NEXT_PUBLIC_OPENAI_API_KEY",
  "VITE_OPENAI_API_KEY",
];

for (const file of [...walk("src"), ...walk("app")]) {
  const text = readText(file);
  const forbiddenPattern = forbiddenClientSecretPatterns.find((pattern) =>
    text.includes(pattern),
  );
  if (forbiddenPattern) {
    fail(`${forbiddenPattern} must not appear in ${file}`);
  }
}

const routeAllowList = new Set([
  "app/api/_server/supabaseAdmin.ts",
  "app/api/internal/support/tenant/route.ts",
]);
for (const file of walk("app")) {
  const text = readText(file);
  if (text.includes("SUPABASE_SERVICE_ROLE_KEY") && !routeAllowList.has(file)) {
    fail(`SUPABASE_SERVICE_ROLE_KEY must not be referenced from ${file}`);
  }
}

const cronVerifier = readText("src/lib/cron/verifyCron.ts");
assertIncludes(
  cronVerifier,
  "timingSafeEqual",
  "cron secret comparison must use timingSafeEqual",
);

const supportRoute = readText("app/api/internal/support/tenant/route.ts");
for (const pattern of [
  "SUPPORT_ADMIN_TOKEN",
  "x-support-token",
  "timingSafeEqual",
  "support_tool_runs",
]) {
  assertIncludes(
    supportRoute,
    pattern,
    `support route must include ${pattern}`,
  );
}

const automationRoute = readText(
  "app/api/ops/issues/[issueId]/suggest-automation/route.ts",
);
for (const pattern of [
  "getBearerToken",
  "supabaseAdmin.auth.getUser",
  "userCanAccessOrg",
  "client: supabaseAdmin",
]) {
  assertIncludes(
    automationRoute,
    pattern,
    `automation suggestion route must include ${pattern}`,
  );
}

const automationGenerator = readText(
  "src/server/ops/suggestions/generateAutomationSuggestion.ts",
);
assertIncludes(
  automationGenerator,
  "serverEnv.OPENAI_API_KEY",
  "automation generator must use server-only OpenAI key",
);

const supabaseCheck = readText("scripts/check-supabase-contract.mjs");
assertIncludes(
  supabaseCheck,
  "Anon exposure checks",
  "Supabase contract must retain anon exposure checks",
);

const roadmap = readText("docs/roadmap/03-core-saas-foundation.md");
assertIncludes(
  roadmap,
  "03.09 Security Review Pass",
  "phase 03.09 report must be linked",
);

const packageJson = readText("package.json");
assertIncludes(
  packageJson,
  "check:security-review",
  "package scripts must include check:security-review",
);

console.log(
  "OK security review contract: env hygiene, service routes, anon checks, secret scans",
);
