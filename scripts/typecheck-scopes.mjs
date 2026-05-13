import { spawnSync } from "node:child_process";

const scopes = [
  ["app", "tsconfig.typecheck.app.json"],
  ["tests", "tsconfig.typecheck.tests.json"],
  ["supabase", "tsconfig.typecheck.supabase.json"],
];

let hasFailure = false;

for (const [name, project] of scopes) {
  const start = Date.now();
  const result = spawnSync(
    process.platform === "win32"
      ? "node_modules\\.bin\\tsc.cmd"
      : "./node_modules/.bin/tsc",
    ["-p", project, "--pretty", "false"],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const errorCount = (output.match(/error TS/g) ?? []).length;
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  if (output.trim()) {
    process.stdout.write(output);
    if (!output.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  const status = result.status === 0 ? "passed" : "failed";
  console.log(
    `[typecheck:${name}] ${status} in ${duration}s (${errorCount} TypeScript errors)`,
  );

  if (result.status !== 0) {
    hasFailure = true;
  }
}

process.exit(hasFailure ? 1 : 0);
