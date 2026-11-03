import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, {
  alias: { "@": path.join(root, "src") },
});
const { compareHardcodedLiterals, compareLocaleKeySets, extractHardcodedLiterals } =
  jiti("../src/i18n/i18nCheck.ts");
const { runI18nCheckTests } = jiti("../src/i18n/i18nCheck.test.ts");

runI18nCheckTests();

const codes = ["en", "es", "pt", "fr", "it", "de"];

function flatKeys(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return flatKeys(child, next);
  });
}

function walk(dir, files) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, files);
      continue;
    }
    if (/\.(test|spec)\.(tsx|ts|jsx|js)$/.test(entry)) continue;
    if (/\.(tsx|jsx|ts|js)$/.test(entry)) files.push(full);
  }
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

const localeSets = {};
for (const code of codes) {
  const base = readJson(`src/locales/${code}.json`);
  const literalPath = `src/locales/literals/${code}.json`;
  if (!existsSync(path.join(root, literalPath))) {
    process.stderr.write(`${code} literal catalog is missing\n`);
    process.exit(1);
  }
  const literals = readJson(literalPath);
  localeSets[code] = flatKeys({ ...base, literals });
  process.stdout.write(`${code} ${localeSets[code].length}\n`);
}

const keyProblems = compareLocaleKeySets(localeSets);
const files = [];
for (const dir of ["src", "app"]) walk(path.join(root, dir), files);

const found = [];
for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (relative.startsWith("src/i18n/") || relative.startsWith("src/locales/")) continue;
  const source = readFileSync(file, "utf8");
  found.push(...extractHardcodedLiterals(source, relative));
}
found.sort();

const baseline = JSON.parse(
  readFileSync(path.join(root, "scripts/i18n-hardcoded-baseline.json"), "utf8"),
);
const literalProblems = compareHardcodedLiterals(found, baseline);
const problems = [...keyProblems, ...literalProblems];

if (problems.length > 0) {
  for (const problem of problems.slice(0, 40)) {
    process.stderr.write(`${problem}\n`);
  }
  if (problems.length > 40) {
    process.stderr.write(`... ${problems.length - 40} more\n`);
  }
  process.exit(1);
}

process.stdout.write(`hard-coded strings ${found.length}\n`);
