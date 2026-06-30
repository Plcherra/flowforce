import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const text = readFileSync("typecheck-errors.txt", "utf8");
const files = [
  ...new Set(
    text
      .split("\n")
      .filter((line) => line.includes("error TS"))
      .map((line) => line.match(/^(.+?)\(\d+/)?.[1]?.replace(/\\/g, "/"))
      .filter(Boolean),
  ),
];

console.log(files.join("\n"));
execSync(`git checkout HEAD -- ${files.map((f) => `"${f}"`).join(" ")}`, {
  stdio: "inherit",
});
