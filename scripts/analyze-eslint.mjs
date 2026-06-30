import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));
const byRule = {};
const byDir = {};

for (const file of report) {
  const rel = file.filePath.replace(/\\/g, "/").split("/flowforce/").pop() ?? file.filePath;
  const dir = rel.split("/").slice(0, 2).join("/");
  byDir[dir] = (byDir[dir] ?? 0) + file.messages.length;

  for (const msg of file.messages) {
    byRule[msg.ruleId] = (byRule[msg.ruleId] ?? 0) + 1;
  }
}

console.log("By rule:", byRule);
console.log(
  "Top dirs:",
  Object.entries(byDir)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20),
);
