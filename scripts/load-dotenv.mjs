import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

const ENV_FILES = [".env.local", ".env"];

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filePath) {
  const values = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripQuotes(normalized.slice(separatorIndex + 1));
    if (!key) continue;
    values[key] = value;
  }

  return values;
}

export function loadDotenv(options = {}) {
  const root = options.root ?? ROOT;
  const files = options.files ?? ENV_FILES;
  const loadedFrom = [];

  for (const fileName of files) {
    const filePath = resolve(root, fileName);
    if (!existsSync(filePath)) continue;

    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || options.override === true) {
        process.env[key] = value;
      }
    }
    loadedFrom.push(fileName);
  }

  return loadedFrom;
}

export function requireEnvKeys(keys) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  return missing;
}
