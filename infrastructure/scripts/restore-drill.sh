#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"
APP_ROOT="${FLOWFORCE_APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${FLOWFORCE_ENV_FILE:-${APP_ROOT}/infrastructure/.env.production}"
BACKUP_ARTIFACT="${FLOWFORCE_BACKUP_ARTIFACT:-}"
REPORT_DIR="${FLOWFORCE_RESTORE_REPORT_DIR:-${APP_ROOT}/docs/restore-drills}"
EXECUTE_RESTORE="${FLOWFORCE_RESTORE_EXECUTE:-0}"
RESTORE_TARGET_URL="${RESTORE_DRILL_DB_URL:-}"

log() {
  printf '[flowforce restore drill] %s\n' "$*"
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

  : "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"

  if [[ -z "$RESTORE_TARGET_URL" ]]; then
    RESTORE_TARGET_URL="${RESTORE_DRILL_DB_URL:-}"
  fi
}

resolve_artifact() {
  if [[ -z "$BACKUP_ARTIFACT" ]]; then
    local backup_dir="${FLOWFORCE_BACKUP_DIR:-/opt/flowforce/backups/database}"
    BACKUP_ARTIFACT="$(find "$backup_dir" -type f -name 'flowforce-*.dump.enc' -print 2>/dev/null | sort | tail -1)"
  fi

  if [[ -z "$BACKUP_ARTIFACT" || ! -f "$BACKUP_ARTIFACT" ]]; then
    printf 'Backup artifact not found. Set FLOWFORCE_BACKUP_ARTIFACT.\n' >&2
    exit 1
  fi
}

write_report() {
  local timestamp report result detail
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  report="${REPORT_DIR}/restore-drill-${timestamp}.md"
  result="$1"
  detail="$2"

  run mkdir -p "$REPORT_DIR"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "would write restore drill report ${report}"
    return 0
  fi

  {
    printf '# Restore Drill %s\n\n' "$timestamp"
    printf '- Result: `%s`\n' "$result"
    printf '- Artifact: `%s`\n' "$BACKUP_ARTIFACT"
    printf '- Mode: `%s`\n' "$([[ "$EXECUTE_RESTORE" == "1" ]] && printf 'restore_target' || printf 'verify_only')"
    printf '- Detail: %s\n' "$detail"
  } > "$report"
  chmod 600 "$report"
  log "restore drill report written to ${report}"
}

verify_or_restore() {
  local temp_dump
  temp_dump="$(mktemp)"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "would decrypt ${BACKUP_ARTIFACT}, run pg_restore --list, and optionally restore to RESTORE_DRILL_DB_URL"
    write_report "dry_run" "Script control flow verified; no backup artifact decrypted."
    return 0
  fi

  trap 'rm -f "$temp_dump"' RETURN

  openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
    -in "$BACKUP_ARTIFACT" -out "$temp_dump"

  pg_restore --list "$temp_dump" >/dev/null

  if [[ "$EXECUTE_RESTORE" == "1" ]]; then
    if [[ -z "$RESTORE_TARGET_URL" ]]; then
      printf 'RESTORE_DRILL_DB_URL is required when FLOWFORCE_RESTORE_EXECUTE=1.\n' >&2
      exit 1
    fi

    pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$RESTORE_TARGET_URL" "$temp_dump"
    write_report "passed" "Decryption, pg_restore listing, and restore into drill database completed."
  else
    write_report "passed" "Decryption and pg_restore listing completed. Target restore was intentionally skipped."
  fi
}

main() {
  require_command openssl
  require_command pg_restore
  load_env
  resolve_artifact
  verify_or_restore
  log "restore drill complete"
}

main "$@"
