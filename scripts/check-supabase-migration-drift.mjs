#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const migrationsDir = resolve(cwd, "supabase", "migrations");
const skipDryRun = process.argv.includes("--skip-dry-run");

function withRemotePassword(args) {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    return args;
  }

  return [...args, "--password", process.env.SUPABASE_DB_PASSWORD];
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function runSupabase(args) {
  const command = process.env.SUPABASE_CLI_BIN || "supabase";
  let result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  if (result.error?.code === "ENOENT" && !process.env.SUPABASE_CLI_BIN) {
    result = spawnSync("npx", ["supabase", ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
  }

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
  };
}

function readLocalMigrationVersions() {
  if (!existsSync(migrationsDir)) {
    fail(`Missing migrations directory: ${migrationsDir}`);
  }

  return readdirSync(migrationsDir)
    .map((fileName) => fileName.match(/^(\d{14})_.*\.sql$/)?.[1])
    .filter(Boolean)
    .sort();
}

function parseMigrationList(output) {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{14})?\s*\|\s*(\d{14})?\s*\|/);
    if (!match) continue;

    rows.push({
      local: match[1] || null,
      remote: match[2] || null,
    });
  }
  return rows;
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function printList(title, values) {
  if (values.length === 0) return;
  process.stdout.write(`\n${title}\n`);
  for (const value of values) {
    process.stdout.write(`  - ${value}\n`);
  }
}

const localVersions = readLocalMigrationVersions();

process.stdout.write("FlowForce Supabase remote migration drift check\n");
process.stdout.write(`Local migration files: ${localVersions.length}\n`);

const listResult = runSupabase(
  withRemotePassword(["migration", "list", "--linked"]),
);
const listOutput = `${listResult.stdout}${listResult.stderr}`;

if (listResult.status !== 0) {
  process.stderr.write(listOutput);
  fail("Could not list linked Supabase migrations.");
}

const rows = parseMigrationList(listOutput);
const listedLocalVersions = rows.map((row) => row.local).filter(Boolean).sort();
const remoteVersions = rows.map((row) => row.remote).filter(Boolean).sort();
const rowMismatches = rows.filter(
  (row) => row.local && row.remote && row.local !== row.remote,
);

const missingOnRemote = difference(localVersions, remoteVersions);
const extraOnRemote = difference(remoteVersions, localVersions);
const missingFromCliLocalList = difference(localVersions, listedLocalVersions);

process.stdout.write(`Remote applied migrations: ${remoteVersions.length}\n`);

printList("Local migrations missing on remote:", missingOnRemote);
printList("Remote migrations missing locally:", extraOnRemote);
printList("Local migrations not shown by Supabase CLI:", missingFromCliLocalList);

if (rowMismatches.length > 0) {
  process.stdout.write("\nMismatched migration rows:\n");
  for (const row of rowMismatches) {
    process.stdout.write(`  - local ${row.local} != remote ${row.remote}\n`);
  }
}

if (
  missingOnRemote.length > 0 ||
  extraOnRemote.length > 0 ||
  missingFromCliLocalList.length > 0 ||
  rowMismatches.length > 0
) {
  fail("Remote migration history does not match source-controlled migrations.");
}

if (!skipDryRun) {
  const dryRunResult = runSupabase(
    withRemotePassword(["db", "push", "--dry-run", "--linked"]),
  );
  const dryRunOutput = `${dryRunResult.stdout}${dryRunResult.stderr}`;

  if (dryRunResult.status !== 0) {
    process.stderr.write(dryRunOutput);
    fail("Supabase dry-run push failed.");
  }

  if (!/Remote database is up to date\./i.test(dryRunOutput)) {
    process.stdout.write(dryRunOutput);
    fail("Supabase dry-run push did not report the remote database as up to date.");
  }
}

process.stdout.write("OK remote migration history matches local migrations.\n");
