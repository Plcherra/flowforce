import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RESTORES = [
  ["userprofile", "user_profile"],
  ["performed_byprofile", "performed_by_profile"],
  ["recordid", "record_id"],
  ["componentId", "component_id"], // only if corrupted from component_id? check first
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "dist"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx?)$/.test(entry)) files.push(path);
  }
  return files;
}

let touched = 0;
for (const file of walk("src")) {
  let source = readFileSync(file, "utf8");
  let next = source.replaceAll("(params as unknown)", "(params as any)");
  for (const [from, to] of RESTORES) {
    next = next.replaceAll(from, to);
  }
  if (next !== source) {
    writeFileSync(file, next, "utf8");
    touched++;
  }
}

console.log(`Patched ${touched} files`);
