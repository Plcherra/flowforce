export type BackupCadence = "managed_supabase_daily" | "pre_release" | "weekly_restore_drill";

export interface BackupPolicyLayer {
  cadence: BackupCadence;
  owner: string;
  retentionDays: number;
  encrypted: boolean;
  evidence: string;
}

export const databaseBackupRestorePolicy = {
  sourceOfTruth: "managed_supabase_postgres",
  managedBackupBaseline: "Supabase managed daily/PITR backups according to project plan.",
  backupScriptPath: "infrastructure/scripts/backup-database.sh",
  restoreDrillScriptPath: "infrastructure/scripts/restore-drill.sh",
  backupDirectory: "/opt/flowforce/backups/database",
  artifactPattern: "flowforce-YYYYMMDDTHHMMSSZ.dump.enc",
  encryption: "openssl aes-256-cbc with pbkdf2 and BACKUP_ENCRYPTION_PASSPHRASE",
  restoreDrillReportDirectory: "docs/restore-drills",
  requiredEnv: [
    "SUPABASE_DB_URL",
    "BACKUP_ENCRYPTION_PASSPHRASE",
    "FLOWFORCE_BACKUP_RETENTION_DAYS",
    "RESTORE_DRILL_DB_URL",
  ],
  policyLayers: [
    {
      cadence: "managed_supabase_daily",
      owner: "Supabase managed database service",
      retentionDays: 7,
      encrypted: true,
      evidence: "Supabase project backup/PITR screen or provider export log.",
    },
    {
      cadence: "pre_release",
      owner: "FlowForce deploy operator",
      retentionDays: 30,
      encrypted: true,
      evidence: "Encrypted pg_dump artifact, sha256 file, and manifest in backup directory.",
    },
    {
      cadence: "weekly_restore_drill",
      owner: "FlowForce deploy operator",
      retentionDays: 90,
      encrypted: true,
      evidence: "Restore drill report in docs/restore-drills.",
    },
  ] satisfies BackupPolicyLayer[],
} as const;

export function buildDatabaseBackupRestoreReadiness() {
  const cadenceSet = new Set(
    databaseBackupRestorePolicy.policyLayers.map((layer) => layer.cadence),
  );

  return {
    hasManagedSupabaseBaseline:
      databaseBackupRestorePolicy.sourceOfTruth === "managed_supabase_postgres",
    hasBackupScript:
      databaseBackupRestorePolicy.backupScriptPath ===
      "infrastructure/scripts/backup-database.sh",
    hasRestoreDrillScript:
      databaseBackupRestorePolicy.restoreDrillScriptPath ===
      "infrastructure/scripts/restore-drill.sh",
    hasRetentionPolicy:
      cadenceSet.has("managed_supabase_daily") &&
      cadenceSet.has("pre_release") &&
      cadenceSet.has("weekly_restore_drill"),
    hasEncryptionPolicy:
      databaseBackupRestorePolicy.policyLayers.every((layer) => layer.encrypted) &&
      databaseBackupRestorePolicy.encryption.includes("pbkdf2"),
    hasRestoreEvidencePath:
      databaseBackupRestorePolicy.restoreDrillReportDirectory === "docs/restore-drills",
  };
}

export function isDatabaseBackupRestoreReady() {
  return Object.values(buildDatabaseBackupRestoreReadiness()).every(Boolean);
}
