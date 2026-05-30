import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirs = new Set([
  ".git",
  ".next",
  "dist",
  "dist-ssr",
  "node_modules",
]);
const ignoredFiles = new Set(["package-lock.json"]);

const bannedPatterns = [
  {
    label: "retired workforce vendor name",
    pattern: new RegExp(["connec", "team"].join(""), "i"),
  },
  {
    label: "retired dough brand variant",
    pattern: new RegExp(["bom", "\\s*-?\\s*", "dough"].join(""), "i"),
  },
  {
    label: "retired operations brand name",
    pattern: new RegExp(["chro", "nique"].join(""), "i"),
  },
  {
    label: "retired checklist vendor name",
    pattern: new RegExp(["jo", "lt"].join(""), "i"),
  },
];

const walk = (relativeDir = ".") => {
  const absoluteDir = path.join(root, relativeDir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const relativePath = path
      .join(relativeDir, entry)
      .replace(/^\.\//, "")
      .split(path.sep)
      .join("/");
    const absolutePath = path.join(root, relativePath);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      if (ignoredDirs.has(entry)) return [];
      return walk(relativePath);
    }

    if (!stat.isFile() || ignoredFiles.has(entry)) return [];
    return [relativePath];
  });
};

const failures = [];

for (const file of walk()) {
  let text = "";
  try {
    text = readFileSync(path.join(root, file), "utf8");
  } catch {
    continue;
  }

  for (const banned of bannedPatterns) {
    if (banned.pattern.test(text)) {
      failures.push(`${file}: ${banned.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Brand mention check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK brand mention contract: retired names absent");
