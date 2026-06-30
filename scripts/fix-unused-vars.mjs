import { readFileSync, writeFileSync } from "node:fs";

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));

const unusedVarRe =
  /^'([^']+)' is (?:defined but never used|assigned a value but never used)/;

let importRemoved = 0;
let prefixed = 0;

for (const file of report) {
  const unusedMessages = file.messages.filter(
    (m) => m.ruleId === "@typescript-eslint/no-unused-vars",
  );
  if (unusedMessages.length === 0) continue;

  let source = readFileSync(file.filePath, "utf8");
  const lines = source.split("\n");
  let changed = false;

  const sorted = [...unusedMessages].sort(
    (a, b) => b.line - a.line || b.column - a.column,
  );

  for (const msg of sorted) {
    const match = msg.message.match(unusedVarRe);
    if (!match) continue;
    const name = match[1];
    if (name.startsWith("_")) continue;

    const lineIdx = msg.line - 1;
    const line = lines[lineIdx];
    if (!line) continue;

    // Remove unused named import
    if (/^\s*import\b/.test(line) || line.includes(" from ")) {
      const importLine = line;
      if (importLine.includes(`{`) && importLine.includes(name)) {
        let next = importLine;

        // Single import: import { foo } from 'x'
        next = next.replace(
          new RegExp(`\\{\\s*${name}\\s*\\}\\s*from`),
          "{ } from",
        );
        // First in list: { foo, bar }
        next = next.replace(
          new RegExp(`\\{\\s*${name}\\s*,`),
          "{",
        );
        // Last in list: { bar, foo }
        next = next.replace(
          new RegExp(`,\\s*${name}\\s*\\}`),
          " }",
        );
        // Only item with type: import type { foo }
        next = next.replace(
          new RegExp(`\\{\\s*${name}\\s*\\}`),
          "{ }",
        );

        if (next !== importLine && !/\{\s*\}/.test(next)) {
          lines[lineIdx] = next;
          source = lines.join("\n");
          importRemoved++;
          changed = true;
          continue;
        }

        // Drop entire line if import becomes empty
        if (/\{\s*\}\s*from/.test(next)) {
          lines.splice(lineIdx, 1);
          source = lines.join("\n");
          importRemoved++;
          changed = true;
          continue;
        }
      }
    }

    // Prefix identifier at reported column (1-based)
    const col = msg.column - 1;
    const before = line.slice(0, col);
    const after = line.slice(col);
    if (after.startsWith(name)) {
      lines[lineIdx] = `${before}_${after}`;
      source = lines.join("\n");
      prefixed++;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(file.filePath, source, "utf8");
  }
}

console.log(`Removed/patched ${importRemoved} unused imports`);
console.log(`Prefixed ${prefixed} unused identifiers`);
