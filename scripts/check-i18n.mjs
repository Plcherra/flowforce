import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const importTs = jiti(import.meta.url, {
  alias: { "@": path.join(root, "src") },
});
const { compareHardcodedLiterals, compareLocaleKeySets, extractHardcodedLiterals } =
  importTs("../src/i18n/i18nCheck.ts");

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
    if (/\.(tsx|jsx|ts|js)$/.test(entry)) files.push(full);
  }
}

const localeSets = {};
for (const code of codes) {
  const file = JSON.parse(
    readFileSync(path.join(root, "src/locales", `${code}.json`), "utf8"),
  );
  localeSets[code] = flatKeys(file);
  process.stdout.write(`${code} ${localeSets[code].length}\n`);
}

const keyProblems = compareLocaleKeySets(localeSets);
const files = [];
for (const dir of ["src", "app"]) walk(path.join(root, dir), files);

const found = [];
for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join("/");
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
