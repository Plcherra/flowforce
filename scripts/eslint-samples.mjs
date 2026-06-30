import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));
const samples = {};

for (const file of report) {
  for (const msg of file.messages) {
    if (!samples[msg.ruleId]) samples[msg.ruleId] = [];
    if (samples[msg.ruleId].length < 5) {
      const rel = file.filePath.split("flowforce\\").pop() ?? file.filePath;
      samples[msg.ruleId].push({ file: rel, line: msg.line, message: msg.message });
    }
  }
}

console.log(JSON.stringify(samples, null, 2));
