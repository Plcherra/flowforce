import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const diff = execSync("git diff -U0 --no-color", { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

const fileChanges = new Map();
let currentFile = null;

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    currentFile = line.slice("+++ b/".length);
    continue;
  }
  if (!currentFile || currentFile === "/dev/null") continue;
  if (line.startsWith("-") && !line.startsWith("---")) {
    const removed = line.slice(1);
    if (/\bany\b/.test(removed)) {
      if (!fileChanges.has(currentFile)) fileChanges.set(currentFile, []);
      fileChanges.get(currentFile).push({ removed, added: null });
    }
  }
  if (line.startsWith("+") && !line.startsWith("+++")) {
    const added = line.slice(1);
    if (/\bunknown\b/.test(added)) {
      const entries = fileChanges.get(currentFile);
      if (entries?.length) {
        const last = entries[entries.length - 1];
        if (last && !last.added) last.added = added;
      }
    }
  }
}

let reverted = 0;
for (const [file, pairs] of fileChanges) {
  let source = readFileSync(file, "utf8");
  let changed = false;
  for (const { removed, added } of pairs) {
    if (!added) continue;
    const restored = added.replace(/\bunknown\b/g, "any");
    if (source.includes(added)) {
      source = source.replace(added, restored);
      reverted++;
      changed = true;
    }
  }
  if (changed) writeFileSync(file, source, "utf8");
}

console.log(`Reverted ${reverted} any->unknown lines across ${fileChanges.size} files`);
