import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));
const samples = [];

for (const file of report) {
  for (const msg of file.messages) {
    if (samples.length >= 15) break;
    samples.push({
      file: file.filePath.split("flowforce\\").pop(),
      line: msg.line,
      message: msg.message,
    });
  }
}

console.log(JSON.stringify(samples, null, 2));
