import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
for (const root of ["src", "app", "tests"]) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    let changed = false;
    const next = lines.map((line) => {
      if (!/^\s*import\b/.test(line)) return line;
      const fixed = line.replace(/\b_([A-Za-z]\w*)/g, "$1");
      if (fixed !== line) changed = true;
      return fixed;
    });
    if (changed) {
      writeFileSync(file, next.join("\n"), "utf8");
      touched++;
    }
  }
}

console.log(`Fixed imports in ${touched} files`);
