import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const requireExecutable = (relativePath) => {
  const mode = statSync(join(root, relativePath)).mode;
  if ((mode & 0o111) === 0) {
    throw new Error(`${relativePath} must be executable`);
  }
};

const backup = readText("infrastructure/scripts/backup-database.sh");
const restore = readText("infrastructure/scripts/restore-drill.sh");
const envTemplate = readText("infrastructure/.env.production.example");
const service = readText("src/services/infrastructure/databaseBackupRestore.ts");
const doc = readText("docs/production-database-backup-restore.md");
const plan = readText("docs/roadmap/10-production-infrastructure-and-launch.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/10-05-database-backup-restore-2026-05-30.md",
);
const packageJson = readText("package.json");

for (const file of [
  "infrastructure/scripts/backup-database.sh",
  "infrastructure/scripts/restore-drill.sh",
]) {
  requireExecutable(file);
}

requireIncludes(
  backup,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    'DRY_RUN" == "1"',
    "SUPABASE_DB_URL",
    "BACKUP_ENCRYPTION_PASSPHRASE",
    "pg_dump --format=custom --no-owner --no-privileges",
    "openssl enc -aes-256-cbc -salt -pbkdf2",
    "sha256sum",
    "manifest",
    "FLOWFORCE_BACKUP_RETENTION_DAYS",
  ],
  "database backup script",
);

requireIncludes(
  restore,
  [
    "#!/usr/bin/env bash",
    "FLOWFORCE_DRY_RUN",
    'DRY_RUN" == "1"',
    "FLOWFORCE_BACKUP_ARTIFACT",
    "BACKUP_ENCRYPTION_PASSPHRASE",
    "pg_restore --list",
    "FLOWFORCE_RESTORE_EXECUTE",
    "RESTORE_DRILL_DB_URL",
    "docs/restore-drills",
    "write_report",
  ],
  "restore drill script",
);

requireIncludes(
  envTemplate,
  [
    "SUPABASE_DB_URL=postgresql://",
    "BACKUP_ENCRYPTION_PASSPHRASE=",
    "FLOWFORCE_BACKUP_DIR=/opt/flowforce/backups/database",
    "FLOWFORCE_BACKUP_RETENTION_DAYS=30",
    "RESTORE_DRILL_DB_URL=",
    "FLOWFORCE_RESTORE_EXECUTE=0",
  ],
  "production env template",
);

requireIncludes(
  service,
  [
    "databaseBackupRestorePolicy",
    "managed_supabase_postgres",
    "backup-database.sh",
    "restore-drill.sh",
    "flowforce-YYYYMMDDTHHMMSSZ.dump.enc",
    "BACKUP_ENCRYPTION_PASSPHRASE",
    "buildDatabaseBackupRestoreReadiness",
    "isDatabaseBackupRestoreReady",
  ],
  "database backup service",
);

requireIncludes(
  doc,
  [
    "Production Database Backup And Restore",
    "Managed Supabase backup/PITR",
    "Pre-release encrypted export",
    "Restore drill",
    "pg_dump --format=custom --no-owner --no-privileges",
    "openssl enc -aes-256-cbc -salt -pbkdf2",
    "Dry-run mode verifies script control flow",
    "The restore drill script never restores into production by default.",
    "Timestamp: 2026-05-30",
    "Required before paid pilot",
  ],
  "database backup doc",
);

requireIncludes(
  plan,
  [
    "- [x] Define backup schedule.",
    "- [x] Add backup script or Supabase backup docs.",
    "- [x] Add restore drill.",
    "- [x] Add retention and encryption notes.",
    "10.05 Database Backup And Restore",
    "production-database-backup-restore.md",
  ],
  "Plan 10 roadmap",
);

const phaseFiveBlock = plan.match(
  /### Phase 5: Database Backup And Restore[\s\S]*?(?=### Phase 6: Monitoring And Logging)/,
)?.[0];

if (!phaseFiveBlock || phaseFiveBlock.includes("- [ ]")) {
  throw new Error("Plan 10 phase 5 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Current phase: Phase 10, Production Infrastructure And Launch",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "managed Supabase backup baseline",
    "encrypted `pg_dump` artifacts",
    "restore-drill script",
    "retention, encryption",
    "Phase 10.06",
  ],
  "Plan 10 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:database-backup-restore",
    "scripts/check-database-backup-restore-contract.mjs",
  ],
  "package scripts",
);

const runtime = await jiti.import(
  join(root, "src/services/infrastructure/databaseBackupRestore.ts"),
);

if (!runtime.isDatabaseBackupRestoreReady()) {
  throw new Error("Database backup restore readiness check failed");
}

const readiness = runtime.buildDatabaseBackupRestoreReadiness();

if (
  !readiness.hasManagedSupabaseBaseline ||
  !readiness.hasBackupScript ||
  !readiness.hasRestoreDrillScript ||
  !readiness.hasRetentionPolicy ||
  !readiness.hasEncryptionPolicy ||
  !readiness.hasRestoreEvidencePath
) {
  throw new Error("Database backup restore readiness flags are incomplete");
}

console.log("OK database backup restore contract");
