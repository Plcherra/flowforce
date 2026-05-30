# Production Database Backup And Restore

FlowForce uses managed Supabase Postgres as the production database. The backup plan has two layers: Supabase-managed backups/PITR according to the project plan, plus FlowForce-owned encrypted export artifacts before risky releases and for restore drills.

## Backup Schedule

| Layer | Schedule | Owner | Retention | Evidence |
| --- | --- | --- | --- | --- |
| Managed Supabase backup/PITR | Daily/PITR according to Supabase project plan | Supabase managed database service | Project-plan dependent, minimum 7 days for paid pilot readiness | Supabase backup/PITR screen or provider export log |
| Pre-release encrypted export | Before migrations, deploys with data-shape changes, or bulk imports | FlowForce deploy operator | 30 days | `.dump.enc`, `.sha256`, and `.manifest.txt` in `/opt/flowforce/backups/database` |
| Restore drill | Weekly during pilot, and before paid launch signoff | FlowForce deploy operator | 90 days for drill reports | `docs/restore-drills/restore-drill-*.md` |

## Backup Script

Script:

```bash
infrastructure/scripts/backup-database.sh
```

Required VPS env values:

```bash
SUPABASE_DB_URL=
BACKUP_ENCRYPTION_PASSPHRASE=
FLOWFORCE_BACKUP_DIR=/opt/flowforce/backups/database
FLOWFORCE_BACKUP_RETENTION_DAYS=30
```

Run:

```bash
FLOWFORCE_ENV_FILE=/opt/flowforce/current/infrastructure/.env.production \
  /opt/flowforce/current/infrastructure/scripts/backup-database.sh
```

Dry-run:

```bash
FLOWFORCE_DRY_RUN=1 infrastructure/scripts/backup-database.sh
```

Dry-run mode verifies script control flow without requiring `pg_dump`, `pg_restore`, or a real Supabase connection on the local machine.

The script:

- runs `pg_dump --format=custom --no-owner --no-privileges`;
- encrypts the dump with `openssl enc -aes-256-cbc -salt -pbkdf2`;
- writes a SHA-256 sidecar file;
- writes a manifest with timestamp, artifact path, format, and source;
- prunes artifacts older than `FLOWFORCE_BACKUP_RETENTION_DAYS`.

## Restore Drill

Script:

```bash
infrastructure/scripts/restore-drill.sh
```

Safe verification mode, default:

```bash
FLOWFORCE_BACKUP_ARTIFACT=/opt/flowforce/backups/database/flowforce-YYYYMMDDTHHMMSSZ.dump.enc \
  FLOWFORCE_ENV_FILE=/opt/flowforce/current/infrastructure/.env.production \
  /opt/flowforce/current/infrastructure/scripts/restore-drill.sh
```

Full restore into a non-production drill database:

```bash
FLOWFORCE_RESTORE_EXECUTE=1 \
RESTORE_DRILL_DB_URL=postgresql://postgres:<password>@<host>:5432/postgres \
FLOWFORCE_BACKUP_ARTIFACT=/opt/flowforce/backups/database/flowforce-YYYYMMDDTHHMMSSZ.dump.enc \
  /opt/flowforce/current/infrastructure/scripts/restore-drill.sh
```

The restore drill script never restores into production by default. In default mode it decrypts the artifact and runs `pg_restore --list`. Full restore requires `FLOWFORCE_RESTORE_EXECUTE=1` and `RESTORE_DRILL_DB_URL`.

## Restore Drill Evidence

Current local script dry-run:

- Timestamp: 2026-05-30
- Result: dry-run script control flow verified
- Scope: setup only; no production artifact existed yet

Required before paid pilot:

- Run the backup script against managed Supabase.
- Run the restore drill against the latest encrypted artifact.
- Run one full restore into a disposable Supabase/local Postgres drill database.
- Commit or attach the generated `docs/restore-drills/restore-drill-*.md` evidence report.

## Encryption And Access Rules

- Backup artifacts are encrypted before they are written to long-term storage.
- `BACKUP_ENCRYPTION_PASSPHRASE` must live only in VPS secret storage or a password manager.
- Backup files and manifests are written with `0600` permissions.
- Backup directories are written with `0700` permissions.
- Offsite copies should be transferred only after encryption and checksum creation.

## Cron Recommendation

Pre-release backups should be run manually by the deploy operator before risky releases. Weekly restore drills can be scheduled after the first VPS deploy:

```cron
15 3 * * 0 FLOWFORCE_ENV_FILE=/opt/flowforce/current/infrastructure/.env.production /opt/flowforce/current/infrastructure/scripts/restore-drill.sh
```

Do not schedule destructive full restores. The cron path should stay in verification mode unless a disposable restore database is explicitly provisioned.
