import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const sets = codes.map((code) => {
  const file = JSON.parse(
    readFileSync(path.join(root, "src/locales", `${code}.json`), "utf8"),
  );
  return { code, keys: new Set(flatKeys(file)) };
});

const union = new Set(sets.flatMap((entry) => [...entry.keys]));
let failed = false;

for (const entry of sets) {
  const missing = [...union].filter((key) => !entry.keys.has(key));
  process.stdout.write(`${entry.code} ${entry.keys.size}\n`);
  if (missing.length > 0) {
    failed = true;
    process.stderr.write(`${entry.code} missing ${missing.length}\n`);
  }
}

if (failed || new Set(sets.map((entry) => entry.keys.size)).size !== 1) {
  process.exit(1);
}
