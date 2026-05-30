#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${FLOWFORCE_ENV_FILE:-${INFRA_DIR}/.env.production}"
DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"

log() {
  printf '[flowforce-alert-test] %s\n' "$*"
}

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  elif [[ "$DRY_RUN" != "1" ]]; then
    printf 'Missing env file: %s\n' "$ENV_FILE" >&2
    exit 1
  fi
}

require_command() {
  if [[ "$DRY_RUN" == "1" ]]; then
    return
  fi

  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

main() {
  load_env
  require_command curl

  local webhook="${MONITORING_ALERT_WEBHOOK_URL:-}"
  local channel="${MONITORING_ALERT_CHANNEL:-ops}"
  local domain="${FLOWFORCE_DOMAIN:-example.com}"
  local health_url="${MONITORING_UPTIME_URL:-https://${domain}/healthz}"
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  local payload
  payload="$(printf '{"text":"FlowForce monitoring alert test","service":"flowforce","channel":"%s","severity":"test","healthUrl":"%s","timestamp":"%s"}' "$channel" "$health_url" "$timestamp")"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "would send monitoring alert test to ${channel}"
    log "payload: ${payload}"
    return
  fi

  if [[ -z "$webhook" ]]; then
    printf 'MONITORING_ALERT_WEBHOOK_URL is required for alert test.\n' >&2
    exit 1
  fi

  log "sending monitoring alert test to ${channel}"
  curl --fail --silent --show-error \
    --request POST \
    --header 'Content-Type: application/json' \
    --data "$payload" \
    "$webhook" >/dev/null
  log "alert test sent"
}

main "$@"
