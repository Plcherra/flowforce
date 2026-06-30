import { readFileSync, writeFileSync } from "node:fs";

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));

let anyFixed = 0;
let escapeFixed = 0;

for (const file of report) {
  if (file.messages.length === 0) continue;

  let source = readFileSync(file.filePath, "utf8");
  const lines = source.split("\n");
  let changed = false;

  // Apply fixes bottom-to-top so line numbers stay valid
  const messages = [...file.messages].sort((a, b) => b.line - a.line || b.column - a.column);

  for (const msg of messages) {
    if (msg.ruleId === "@typescript-eslint/no-explicit-any" && msg.suggestions?.length) {
      const suggestion = msg.suggestions.find((s) => s.messageId === "suggestUnknown");
      if (suggestion?.fix) {
        const { range, text } = suggestion.fix;
        source = source.slice(0, range[0]) + text + source.slice(range[1]);
        anyFixed++;
        changed = true;
      }
    }

    if (msg.ruleId === "no-useless-escape") {
      const lineIdx = msg.line - 1;
      const line = lines[lineIdx];
      if (!line) continue;

      // Remove backslash before non-special chars in regex/string contexts
      const fixed = line.replace(/\\([+()"[\]/])/g, "$1");
      if (fixed !== line) {
        lines[lineIdx] = fixed;
        source = lines.join("\n");
        escapeFixed++;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(file.filePath, source, "utf8");
  }
}

console.log(`Applied ${anyFixed} any->unknown fixes`);
console.log(`Applied ${escapeFixed} useless-escape fixes`);
