import { readFileSync } from "node:fs";

const text = readFileSync("typecheck-errors.txt", "utf8");
const byFile = {};

for (const line of text.split("\n")) {
  const match = line.match(/^(.+\.(tsx?))\(\d+/);
  if (match) byFile[match[1]] = (byFile[match[1]] ?? 0) + 1;
}

console.log(
  Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20),
);
