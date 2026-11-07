import { execFileSync } from "node:child_process";
import process from "node:process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const warnAbove = 400;
const failAbove = 500;
const allowlistPath = path.join(root, "scripts/file-length-allowlist.json");
const sourceRoots = ["src", "app", "scripts"];
const skipDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "playwright-report",
]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const vendor = "supa" + "base";
const generated = new Set([
  `src/integrations/${vendor}/types.ts`,
  `${vendor}/database.types.ts`,
  `src/integrations/${vendor}/public-types.ts`,
]);

function excluded(relativePath) {
  if (generated.has(relativePath) || relativePath.endsWith(".d.ts")) return true;
  if (relativePath.startsWith("src/locales/")) return true;
  const name = path.basename(relativePath);
  if (name.includes(".test.") || name.includes(".spec.")) return true;
  const parts = new Set(relativePath.split("/"));
  return parts.has("e2e") || parts.has("tests") || parts.has("__tests__");
}

function lineCount(absolutePath) {
  const text = readFileSync(absolutePath, "utf8");
  if (text.length === 0) return 0;
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

function walk(relativeDir, files) {
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) return;
  for (const entry of readdirSync(absoluteDir)) {
    if (skipDirs.has(entry)) continue;
    const absolute = path.join(absoluteDir, entry);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (statSync(absolute).isDirectory()) {
      walk(relative, files);
      continue;
    }
    if (!extensions.has(path.extname(entry))) continue;
    if (excluded(relative)) continue;
    files.push(relative);
  }
}

function expandPath(value) {
  return value.replaceAll("__DB_VENDOR__", vendor);
}

function readAllowlist(absolutePath) {
  const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("file length allowlist must be an array");
  }
  return parsed.map((entry) => {
    if (!entry || typeof entry.path !== "string" || typeof entry.lines !== "number") {
      throw new Error("each allowlist entry needs a path and a line count");
    }
    if (typeof entry.ticket !== "string" || !entry.ticket.trim()) {
      throw new Error(`${entry.path} is missing a split ticket`);
    }
    return {
      path: expandPath(entry.path),
      lines: entry.lines,
      ticket: entry.ticket,
    };
  });
}

function readBaseAllowlist() {
  try {
    const text = execFileSync(
      "git",
      ["show", "origin/main:scripts/file-length-allowlist.json"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return readAllowlistBuffer(text);
  } catch {
    return null;
  }
}

function readAllowlistBuffer(text) {
  const parsed = JSON.parse(text);
  return new Map(parsed.map((entry) => [expandPath(entry.path), entry.lines]));
}

const files = [];
for (const sourceRoot of sourceRoots) walk(sourceRoot, files);
const counts = new Map(files.map((relative) => [relative, lineCount(path.join(root, relative))]));
const allowlist = readAllowlist(allowlistPath);
const failures = [];
const warnings = [];

for (let index = 1; index < allowlist.length; index += 1) {
  const previous = allowlist[index - 1];
  const current = allowlist[index];
  if (current.lines > previous.lines) {
    failures.push(
      `${current.path} is listed before a larger file. Keep the allowlist largest first.`,
    );
  }
}

const seen = new Set();
for (const entry of allowlist) {
  if (seen.has(entry.path)) failures.push(`${entry.path} is listed twice`);
  seen.add(entry.path);
  if (excluded(entry.path)) {
    failures.push(`${entry.path} is excluded from the check and cannot be allowlisted`);
  }
  const actual = counts.get(entry.path);
  if (actual === undefined) {
    failures.push(`${entry.path} is allowlisted but is not a checked source file`);
    continue;
  }
  if (actual > entry.lines) {
    failures.push(
      `${entry.path} grew from ${entry.lines} to ${actual} lines. The allowlist cannot grow.`,
    );
  } else if (actual < entry.lines) {
    failures.push(
      `${entry.path} shrank to ${actual} lines. Lower its allowlist ceiling to ${actual}.`,
    );
  }
  if (actual <= failAbove) {
    failures.push(
      `${entry.path} is ${actual} lines. Remove it from the allowlist.`,
    );
  }
}

for (const [relative, count] of counts) {
  if (seen.has(relative)) continue;
  if (count > failAbove) {
    failures.push(
      `${relative} is ${count} lines. New source files fail above ${failAbove}.`,
    );
  } else if (count > warnAbove) {
    warnings.push(`${relative} is ${count} lines. Source files warn above ${warnAbove}.`);
  }
}

const base = readBaseAllowlist();
if (base) {
  for (const entry of allowlist) {
    if (!base.has(entry.path)) {
      failures.push(
        `${entry.path} was added to the allowlist. The list can only shrink.`,
      );
    } else if (entry.lines > base.get(entry.path)) {
      failures.push(
        `${entry.path} ceiling grew from ${base.get(entry.path)} to ${entry.lines}.`,
      );
    }
  }
}

if (warnings.length > 0) {
  process.stdout.write(
    `file length warnings ${warnings.length} (above ${warnAbove}, at or under ${failAbove})\n`,
  );
  for (const warning of warnings) process.stdout.write(`warn: ${warning}\n`);
}

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  `file length ok. allowlisted ${allowlist.length}. warnings ${warnings.length}.\n`,
);
