#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { loadDotenv } from "./load-dotenv.mjs";

const root = process.cwd();
const loadedFrom = loadDotenv();
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "vncapxfubgqaibhjwtoy";

function runSupabase(args) {
  const command = process.env.SUPABASE_CLI_BIN || "supabase";
  let result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });

  if (result.error?.code === "ENOENT" && !process.env.SUPABASE_CLI_BIN) {
    result = spawnSync("npx", ["supabase", ...args], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
  }

  return {
    status: result.status ?? 1,
    stdout: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function printSection(title) {
  process.stdout.write(`\n${title}\n`);
}

const issues = [];
const fixes = [];

printSection("FlowForce Supabase CLI doctor");

if (loadedFrom.length === 0) {
  issues.push("No .env.local file found.");
  fixes.push("Copy .env.example to .env.local and fill in Supabase credentials.");
} else {
  process.stdout.write(`Loaded env from: ${loadedFrom.join(", ")}\n`);
}

const versionResult = runSupabase(["--version"]);
if (versionResult.status === 0) {
  process.stdout.write(`Supabase CLI: ${versionResult.stdout.trim()}\n`);
} else {
  issues.push("Supabase CLI is not installed or not on PATH.");
  fixes.push("Install the CLI: npm i -g supabase");
}

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";
if (!token) {
  issues.push("SUPABASE_ACCESS_TOKEN is missing from .env.local.");
  fixes.push(
    "Create a Personal Access Token at https://supabase.com/dashboard/account/tokens (starts with sbp_) and add SUPABASE_ACCESS_TOKEN to .env.local.",
  );
} else if (!token.startsWith("sbp_")) {
  issues.push(
    "SUPABASE_ACCESS_TOKEN does not look like a Supabase personal access token.",
  );
  fixes.push(
    "Use a token from Account -> Access Tokens (sbp_...). Do NOT use anon keys, service role keys, or JWTs.",
  );
}

const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim() ?? "";
if (!dbPassword) {
  issues.push("SUPABASE_DB_PASSWORD is missing from .env.local.");
  fixes.push(
    "Copy the database password from Project Settings -> Database and add SUPABASE_DB_PASSWORD to .env.local.",
  );
}

const projectsResult = runSupabase(["projects", "list"]);
if (projectsResult.status !== 0) {
  if (/Invalid access token format/i.test(projectsResult.stdout)) {
    issues.push("Supabase CLI has an invalid stored or configured access token.");
    fixes.push(
      "Run `supabase logout`, then either `supabase login` (browser) or set SUPABASE_ACCESS_TOKEN=sbp_... in .env.local and use npm scripts.",
    );
  } else if (/Access token not provided/i.test(projectsResult.stdout)) {
    issues.push("Supabase CLI is not authenticated.");
    fixes.push(
      "Run `supabase login` once, or set SUPABASE_ACCESS_TOKEN in .env.local.",
    );
  } else {
    issues.push("Could not list Supabase projects.");
    fixes.push(projectsResult.stdout.trim() || "Check network access and token.");
  }
} else {
  process.stdout.write("Supabase account auth: OK\n");
}

if (dbPassword) {
  const migrationResult = runSupabase([
    "migration",
    "list",
    "--linked",
    "--password",
    dbPassword,
  ]);

  if (migrationResult.status !== 0) {
    if (/password authentication failed/i.test(migrationResult.stdout)) {
      issues.push("Database password authentication failed.");
      fixes.push(
        "Reset or copy the correct database password from Supabase Dashboard -> Project Settings -> Database, then update SUPABASE_DB_PASSWORD in .env.local.",
      );
    } else if (/not linked/i.test(migrationResult.stdout)) {
      issues.push(`Project ${projectRef} is not linked in this repo.`);
      fixes.push("Run `npm run supabase:link` once after auth is fixed.");
    } else {
      issues.push("Could not read linked migration history.");
      fixes.push(migrationResult.stdout.trim() || "Run `npm run supabase:link`.");
    }
  } else {
    process.stdout.write("Project link + remote database auth: OK\n");
  }
} else {
  issues.push("Cannot verify project link without SUPABASE_DB_PASSWORD.");
  fixes.push("Add SUPABASE_DB_PASSWORD to .env.local, then run `npm run supabase:link`.");
}

printSection("Summary");
if (issues.length === 0) {
  process.stdout.write("All Supabase CLI checks passed.\n");
  process.stdout.write("Use `npm run db:push` for migrations going forward.\n");
  process.exit(0);
}

process.stdout.write("Issues found:\n");
for (const issue of issues) {
  process.stdout.write(`  - ${issue}\n`);
}

printSection("Recommended fix (one-time)");
for (const fix of fixes) {
  process.stdout.write(`  - ${fix}\n`);
}

process.stdout.write(`
Permanent workflow after setup:
  1. Keep secrets only in .env.local (gitignored).
  2. Run Supabase through npm scripts so env loads automatically:
       npm run supabase:doctor
       npm run supabase:link
       npm run db:push
  3. Do not paste API keys into \`supabase login\`; use sbp_ access tokens only.
`);

process.exit(1);
