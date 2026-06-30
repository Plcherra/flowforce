import { readFileSync, writeFileSync } from "node:fs";

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));

const unusedVarRe =
  /^'([^']+)' is (?:defined but never used|assigned a value but never used)/;

let importRemoved = 0;
let prefixed = 0;
let skipped = 0;

for (const file of report) {
  const unusedMessages = file.messages.filter(
    (m) => m.ruleId === "@typescript-eslint/no-unused-vars",
  );
  if (unusedMessages.length === 0) continue;

  let lines = readFileSync(file.filePath, "utf8").split("\n");
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
    let line = lines[lineIdx];
    if (!line) continue;

    if (/^\s*import\b/.test(line)) {
      const before = line;
      line = line
        .replace(new RegExp(`\\b${name}\\s*,`), "")
        .replace(new RegExp(`,\\s*${name}\\b`), "")
        .replace(new RegExp(`{\\s*${name}\\s*}\\s*from`), "{ } from")
        .replace(new RegExp(`import\\s+${name}\\s+from`), "import {} from");

      if (/\{\s*\}\s*from/.test(line) || /import\s+\{\s*\}\s*from/.test(line)) {
        lines.splice(lineIdx, 1);
      } else {
        lines[lineIdx] = line;
      }

      if (before !== (lines[lineIdx] ?? "")) {
        importRemoved++;
        changed = true;
      }
      continue;
    }

    const col = msg.column - 1;
    const before = line.slice(0, col);
    const after = line.slice(col);

    if (!after.startsWith(name)) {
      skipped++;
      continue;
    }

    const rest = after.slice(name.length);
    if (/^\s*:/.test(rest)) {
      lines[lineIdx] = `${before}${name}: _${name}${rest}`;
    } else if (/^\s*,/.test(rest) || /^\s*\}/.test(rest) || /^\s*\)/.test(rest)) {
      lines[lineIdx] = `${before}_${after}`;
    } else {
      skipped++;
      continue;
    }

    prefixed++;
    changed = true;
  }

  if (changed) {
    writeFileSync(file.filePath, lines.join("\n"), "utf8");
  }
}

console.log(`Removed ${importRemoved} unused imports`);
console.log(`Prefixed ${prefixed} unused bindings`);
console.log(`Skipped ${skipped} ambiguous cases`);
