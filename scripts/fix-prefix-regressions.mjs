import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const typecheck = readFileSync("typecheck-errors.txt", "utf8");
const renames = new Map();

for (const line of typecheck.split("\n")) {
  const exportMatch = line.match(
    /has no exported member named '_(\w+)'\. Did you mean '(\w+)'/,
  );
  if (exportMatch) {
    renames.set(`_${exportMatch[1]}`, exportMatch[2]);
    continue;
  }

  const propMatch = line.match(/Property '_(\w+)' does not exist on type/);
  if (propMatch) {
    renames.set(`_${propMatch[1]}`, propMatch[1]);
  }
}

console.log("Renames to apply:", [...renames.entries()].slice(0, 20), "... total", renames.size);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "dist", "android", "ios"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx?)$/.test(entry)) files.push(path);
  }
  return files;
}

const roots = ["src", "app", "tests"];
let filesTouched = 0;

for (const root of roots) {
  for (const file of walk(root)) {
    let source = readFileSync(file, "utf8");
    let next = source;
    for (const [from, to] of renames) {
      next = next.replaceAll(from, to);
    }
    if (next !== source) {
      writeFileSync(file, next, "utf8");
      filesTouched++;
    }
  }
}

console.log(`Updated ${filesTouched} files`);
