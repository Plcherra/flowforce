import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (entry.endsWith(".ts")) files.push(path);
  }
  return files;
}

let touched = 0;
for (const file of walk("app/api")) {
  const source = readFileSync(file, "utf8");
  const next = source.replaceAll("/server/", "/_server/");
  if (next !== source) {
    writeFileSync(file, next, "utf8");
    touched++;
  }
}

console.log(`Restored _server paths in ${touched} files`);
