#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"
APP_ROOT="${FLOWFORCE_APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${FLOWFORCE_ENV_FILE:-${APP_ROOT}/infrastructure/.env.production}"
BACKUP_DIR="${FLOWFORCE_BACKUP_DIR:-/opt/flowforce/backups/database}"
RETENTION_DAYS="${FLOWFORCE_BACKUP_RETENTION_DAYS:-30}"

log() {
  printf '[flowforce db backup] %s\n' "$*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] %q ' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

require_command() {
  if [[ "$DRY_RUN" == "1" ]]; then
    return 0
  fi

  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    printf 'Required env file missing: %s\n' "$ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  : "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required for pg_dump backups}"
  : "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
}

prepare_backup_dir() {
  run mkdir -p "$BACKUP_DIR"
  run chmod 700 "$BACKUP_DIR"
}

write_backup() {
  local timestamp artifact manifest sha_file
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  artifact="${BACKUP_DIR}/flowforce-${timestamp}.dump.enc"
  manifest="${BACKUP_DIR}/flowforce-${timestamp}.manifest.txt"
  sha_file="${artifact}.sha256"

  log "creating encrypted backup artifact ${artifact}"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "would run pg_dump -Fc and encrypt with openssl aes-256-cbc/pbkdf2"
  else
    pg_dump --format=custom --no-owner --no-privileges "$SUPABASE_DB_URL" \
      | openssl enc -aes-256-cbc -salt -pbkdf2 -pass env:BACKUP_ENCRYPTION_PASSPHRASE -out "$artifact"
    chmod 600 "$artifact"
    sha256sum "$artifact" > "$sha_file"
    chmod 600 "$sha_file"
    {
      printf 'created_at_utc=%s\n' "$timestamp"
      printf 'artifact=%s\n' "$artifact"
      printf 'sha256_file=%s\n' "$sha_file"
      printf 'format=pg_dump_custom_encrypted_openssl_aes_256_cbc_pbkdf2\n'
      printf 'source=managed_supabase\n'
      printf 'restore_drill_required=true\n'
    } > "$manifest"
    chmod 600 "$manifest"
  fi
}

prune_old_backups() {
  log "pruning encrypted backups older than ${RETENTION_DAYS} days"
  run find "$BACKUP_DIR" -type f \
    \( -name 'flowforce-*.dump.enc' -o -name 'flowforce-*.dump.enc.sha256' -o -name 'flowforce-*.manifest.txt' \) \
    -mtime "+${RETENTION_DAYS}" -delete
}

main() {
  require_command pg_dump
  require_command openssl
  require_command sha256sum
  load_env
  prepare_backup_dir
  write_backup
  prune_old_backups
  log "backup complete"
}

main "$@"
