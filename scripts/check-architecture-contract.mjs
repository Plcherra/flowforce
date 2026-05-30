import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  "src/types/platform.ts",
  "src/types/index.ts",
  "src/shared/index.ts",
  "src/shared/components/index.ts",
  "src/shared/data-access/index.ts",
  "src/app-shell/architecture.ts",
  "src/app-shell/index.ts",
  "src/server/api-boundary.ts",
  "docs/environment-configuration.md",
];

const requiredAliases = {
  "@app-shell/*": "./src/app-shell/*",
  "@features/*": "./src/features/*",
  "@server/*": "./src/server/*",
  "@shared/*": "./src/shared/*",
};

const clientLeakPatterns = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "supabase.auth.admin",
  "auth.admin.",
];

const ignoredLeakPaths = new Set([
  "src/lib/env.ts",
  "src/services/supabase/admin.ts",
]);

const ignoredLeakPrefixes = ["app/api/", "src/server/"];

const codeExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

const toPosix = (filePath) => filePath.split(path.sep).join("/");

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const fail = (message) => {
  errors.push(message);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`Missing architecture file: ${file}`);
  }
}

const tsconfig = readJson("tsconfig.json");
const paths = tsconfig.compilerOptions?.paths ?? {};

for (const [alias, expectedPath] of Object.entries(requiredAliases)) {
  const actual = paths[alias];

  if (!Array.isArray(actual) || actual[0] !== expectedPath) {
    fail(
      `tsconfig alias ${alias} should point to ${expectedPath}; found ${JSON.stringify(
        actual,
      )}`,
    );
  }
}

const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");

for (const alias of Object.keys(requiredAliases)) {
  const aliasRoot = alias.replace("/*", "");

  if (!nextConfig.includes(`'${aliasRoot}'`)) {
    fail(`next.config.mjs is missing migration alias ${aliasRoot}`);
  }
}

const walk = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);

  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = toPosix(path.join(relativeDir, entry.name));

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") {
          return [];
        }

        return walk(relativePath);
      }

      if (!entry.isFile() || !codeExtensions.has(path.extname(entry.name))) {
        return [];
      }

      return [relativePath];
    });
};

const shouldIgnoreLeakPath = (relativePath) =>
  ignoredLeakPaths.has(relativePath) ||
  ignoredLeakPrefixes.some((prefix) => relativePath.startsWith(prefix));

for (const file of [...walk("src"), ...walk("app")]) {
  if (shouldIgnoreLeakPath(file)) {
    continue;
  }

  const contents = fs.readFileSync(path.join(root, file), "utf8");
  const leakedPattern = clientLeakPatterns.find((pattern) =>
    contents.includes(pattern),
  );

  if (leakedPattern) {
    fail(
      `Server-only Supabase admin usage leaked into client surface: ${file}`,
    );
  }
}

if (errors.length > 0) {
  console.error("Architecture contract check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Architecture contract check passed.");
