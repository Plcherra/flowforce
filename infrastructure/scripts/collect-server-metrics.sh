#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${FLOWFORCE_ENV_FILE:-${INFRA_DIR}/.env.production}"
DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"

log() {
  printf '[flowforce-server-metrics] %s\n' "$*"
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

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_snapshot() {
  local output_file="$1"
  local health_url="$2"
  local timestamp="$3"
  local disk_summary="$4"
  local memory_summary="$5"
  local compose_summary="$6"
  local docker_summary="$7"
  local health_status="$8"

  cat >"$output_file" <<JSON
{
  "service": "flowforce",
  "timestamp": "${timestamp}",
  "healthUrl": "$(json_escape "$health_url")",
  "healthStatus": "$(json_escape "$health_status")",
  "disk": "$(json_escape "$disk_summary")",
  "memory": "$(json_escape "$memory_summary")",
  "compose": "$(json_escape "$compose_summary")",
  "dockerStats": "$(json_escape "$docker_summary")"
}
JSON
}

main() {
  load_env

  local domain="${FLOWFORCE_DOMAIN:-example.com}"
  local health_url="${MONITORING_UPTIME_URL:-https://${domain}/healthz}"
  local metrics_dir="${MONITORING_METRICS_DIR:-/opt/flowforce/monitoring/server-metrics}"
  local timestamp
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  local output_file="${metrics_dir}/flowforce-server-metrics-${timestamp}.json"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "would write server metrics snapshot to ${output_file}"
    log "would probe ${health_url}, disk, memory, docker compose ps, and docker stats"
    return
  fi

  mkdir -p "$metrics_dir"

  local disk_summary
  disk_summary="$(df -h / | tail -1 | awk '{print "size="$2",used="$3",available="$4",usePercent="$5}')"

  local memory_summary="unavailable"
  if command -v free >/dev/null 2>&1; then
    memory_summary="$(free -m | awk '/Mem:/ {print "totalMb="$2",usedMb="$3",freeMb="$4",availableMb="$7}')"
  fi

  local compose_summary="unavailable"
  if command -v docker >/dev/null 2>&1; then
    compose_summary="$(cd "$INFRA_DIR" && docker compose --env-file .env.production -f docker-compose.vps.yml ps --format json 2>/dev/null || true)"
  fi

  local docker_summary="unavailable"
  if command -v docker >/dev/null 2>&1; then
    docker_summary="$(docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} mem={{.MemUsage}}' 2>/dev/null || true)"
  fi

  local health_status="unavailable"
  if command -v curl >/dev/null 2>&1; then
    health_status="$(curl --silent --show-error --max-time 10 --output /dev/null --write-out '%{http_code}' "$health_url" || true)"
  fi

  write_snapshot \
    "$output_file" \
    "$health_url" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$disk_summary" \
    "$memory_summary" \
    "$compose_summary" \
    "$docker_summary" \
    "$health_status"

  log "server metrics snapshot written to ${output_file}"
}

main "$@"
