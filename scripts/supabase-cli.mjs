#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { loadDotenv, requireEnvKeys } from "./load-dotenv.mjs";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "vncapxfubgqaibhjwtoy";
const loadedFrom = loadDotenv();
const args = process.argv.slice(2);

if (args.length === 0) {
  process.stderr.write(
    [
      "Usage: node scripts/supabase-cli.mjs <supabase-args...>",
      "",
      "Examples:",
      "  npm run db:push",
      "  npm run supabase -- migration list",
      "  npm run supabase -- db push --dry-run",
      "",
      loadedFrom.length
        ? `Loaded env from: ${loadedFrom.join(", ")}`
        : "No .env.local found. Copy .env.example to .env.local first.",
      "",
    ].join("\n"),
  );
  process.exit(args.length === 0 ? 1 : 0);
}

const command = args[0];
const remoteDbCommands = new Set(["push", "pull", "reset", "dump", "lint"]);
const needsDbPassword =
  (command === "db" &&
    remoteDbCommands.has(args[1]) &&
    !args.includes("--local")) ||
  (command === "link" && !args.includes("--password"));

const supabaseArgs = [...args];

if (needsDbPassword) {
  const missing = requireEnvKeys(["SUPABASE_DB_PASSWORD"]);
  if (missing.length > 0) {
    process.stderr.write(
      [
        "Missing required Supabase database credentials in .env.local:",
        ...missing.map((key) => `  - ${key}`),
        "",
        "Get the database password from:",
        "  Supabase Dashboard -> Project Settings -> Database -> Database password",
        "",
        "Then add to .env.local:",
        "  SUPABASE_DB_PASSWORD=your_database_password",
        "",
        "Run `npm run supabase:doctor` for a full auth checklist.",
      ].join("\n"),
    );
    process.exit(1);
  }
}

if (command === "link" && !supabaseArgs.includes("--project-ref")) {
  supabaseArgs.push("--project-ref", PROJECT_REF);
}
const usesLinkedRemote =
  supabaseArgs[0] === "db" &&
  remoteDbCommands.has(supabaseArgs[1]) &&
  !supabaseArgs.includes("--local") &&
  !supabaseArgs.includes("--db-url");

if (usesLinkedRemote && !supabaseArgs.includes("--linked")) {
  supabaseArgs.splice(2, 0, "--linked");
}

if (needsDbPassword && !supabaseArgs.includes("--password")) {
  supabaseArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
}

if (
  (supabaseArgs[0] === "migration" && supabaseArgs.includes("list")) ||
  supabaseArgs[0] === "gen"
) {
  if (!supabaseArgs.includes("--linked") && !supabaseArgs.includes("--local")) {
    supabaseArgs.push("--linked");
  }
  if (
    supabaseArgs.includes("--linked") &&
    process.env.SUPABASE_DB_PASSWORD &&
    !supabaseArgs.includes("--password")
  ) {
    supabaseArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
  }
}

function run(commandName, commandArgs) {
  let result = spawnSync(commandName, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
    env: process.env,
  });

  if (result.error?.code === "ENOENT" && commandName === "supabase") {
    result = spawnSync("npx", ["supabase", ...commandArgs], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "inherit",
      env: process.env,
    });
  }

  return result.status ?? 1;
}

process.exit(run(process.env.SUPABASE_CLI_BIN || "supabase", supabaseArgs));
