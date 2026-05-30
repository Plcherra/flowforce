#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"
APP_ROOT="${FLOWFORCE_APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${FLOWFORCE_ENV_FILE:-${APP_ROOT}/infrastructure/.env.production}"
COMPOSE_FILE="${FLOWFORCE_COMPOSE_FILE:-${APP_ROOT}/infrastructure/docker-compose.vps.yml}"
IMAGE_NAME="${FLOWFORCE_IMAGE_NAME:-flowforce-web}"
IMAGE_TAG="${FLOWFORCE_IMAGE_TAG:-latest}"
ROLLBACK_TAG="${FLOWFORCE_ROLLBACK_TAG:-rollback}"
HEALTH_URL="${FLOWFORCE_HEALTH_URL:-}"

log() {
  printf '[flowforce rollback] %s\n' "$*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] %q ' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    printf 'Docker Compose is not available. Install docker-compose-plugin or docker-compose.\n' >&2
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    printf 'Required file missing: %s\n' "$1" >&2
    exit 1
  fi
}

load_env_for_health() {
  require_file "$ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  if [[ -z "$HEALTH_URL" ]]; then
    HEALTH_URL="https://${FLOWFORCE_DOMAIN}/healthz"
  fi
}

restore_image() {
  if ! docker image inspect "${IMAGE_NAME}:${ROLLBACK_TAG}" >/dev/null 2>&1 && [[ "$DRY_RUN" != "1" ]]; then
    printf 'Rollback image missing: %s:%s\n' "$IMAGE_NAME" "$ROLLBACK_TAG" >&2
    exit 1
  fi

  log "restoring ${IMAGE_NAME}:${ROLLBACK_TAG} to ${IMAGE_NAME}:${IMAGE_TAG}"
  run docker tag "${IMAGE_NAME}:${ROLLBACK_TAG}" "${IMAGE_NAME}:${IMAGE_TAG}"
}

restart_stack() {
  log "restarting stack from rollback image"
  run compose_cmd --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-build --remove-orphans
}

verify_health() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "would verify ${HEALTH_URL}"
    return 0
  fi

  log "waiting for ${HEALTH_URL}"
  for _ in {1..45}; do
    if curl -fsS "$HEALTH_URL" >/dev/null; then
      log "rollback health check passed"
      return 0
    fi
    sleep 2
  done

  printf 'Rollback health check failed: %s\n' "$HEALTH_URL" >&2
  compose_cmd --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2 || true
  exit 1
}

main() {
  require_file "$COMPOSE_FILE"
  load_env_for_health
  restore_image
  restart_stack
  verify_health
  log "rollback complete"
}

main "$@"
