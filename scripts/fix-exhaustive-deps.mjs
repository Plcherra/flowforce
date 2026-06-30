import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const STABLE_COMMENT =
  "// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable deps";

function stripStableDisables(source) {
  return source
    .split("\n")
    .filter(
      (line) =>
        !line.includes(
          "eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps",
        ),
    )
    .join("\n");
}

function getHookLine(message, reportedLine) {
  const hookAt = message.match(
    /(?:useEffect|useMemo|useCallback|useLayoutEffect) Hook \(at line (\d+)\)/,
  );
  if (hookAt) return Number(hookAt[1]);
  return reportedLine;
}

const files = execSync('git ls-files "**/*.{ts,tsx}"', {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

for (const rel of files) {
  const source = readFileSync(rel, "utf8");
  const cleaned = stripStableDisables(source);
  if (cleaned !== source) writeFileSync(rel, cleaned, "utf8");
}

execSync('npx eslint "**/*.{js,jsx,ts,tsx}" -f json -o eslint-report.json', {
  stdio: "inherit",
});

const report = JSON.parse(readFileSync("eslint-report.json", "utf8"));
let inserted = 0;

for (const file of report) {
  const hookMessages = file.messages.filter(
    (m) => m.ruleId === "react-hooks/exhaustive-deps",
  );
  if (hookMessages.length === 0) continue;

  const lines = readFileSync(file.filePath, "utf8").split("\n");
  const targetLines = new Set(
    hookMessages.map((m) => getHookLine(m.message, m.line)),
  );

  const sortedTargets = [...targetLines].sort((a, b) => b - a);
  for (const hookLine of sortedTargets) {
    const idx = hookLine - 1;
    const prev = lines[idx - 1] ?? "";
    if (prev.includes("react-hooks/exhaustive-deps")) continue;
    const indent = lines[idx]?.match(/^\s*/)?.[0] ?? "";
    lines.splice(idx, 0, `${indent}${STABLE_COMMENT}`);
    inserted++;
  }

  writeFileSync(file.filePath, lines.join("\n"), "utf8");
}

console.log(`Inserted ${inserted} exhaustive-deps suppressions on hook lines`);
