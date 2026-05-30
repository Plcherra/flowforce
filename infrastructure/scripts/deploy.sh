#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"
APP_ROOT="${FLOWFORCE_APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${FLOWFORCE_ENV_FILE:-${APP_ROOT}/infrastructure/.env.production}"
COMPOSE_FILE="${FLOWFORCE_COMPOSE_FILE:-${APP_ROOT}/infrastructure/docker-compose.vps.yml}"
CADDYFILE="${FLOWFORCE_CADDYFILE:-${APP_ROOT}/infrastructure/caddy/Caddyfile}"
IMAGE_NAME="${FLOWFORCE_IMAGE_NAME:-flowforce-web}"
IMAGE_TAG="${FLOWFORCE_IMAGE_TAG:-latest}"
ROLLBACK_TAG="${FLOWFORCE_ROLLBACK_TAG:-rollback}"
HEALTH_URL="${FLOWFORCE_HEALTH_URL:-}"

log() {
  printf '[flowforce deploy] %s\n' "$*"
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

validate_env() {
  require_file "$ENV_FILE"

  local required=(
    FLOWFORCE_DOMAIN
    ACME_EMAIL
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
  )

  local missing=()
  for key in "${required[@]}"; do
    if ! grep -Eq "^${key}=.+" "$ENV_FILE"; then
      missing+=("$key")
    fi
  done

  if ((${#missing[@]})); then
    printf 'Missing required env values in %s: %s\n' "$ENV_FILE" "${missing[*]}" >&2
    exit 1
  fi

  if grep -Eq 'your_|example\.com|ops@example\.com' "$ENV_FILE"; then
    printf 'Production env file still contains template values: %s\n' "$ENV_FILE" >&2
    exit 1
  fi
}

load_env_for_health() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  if [[ -z "$HEALTH_URL" ]]; then
    HEALTH_URL="https://${FLOWFORCE_DOMAIN}/healthz"
  fi
}

validate_caddy() {
  require_file "$CADDYFILE"
  log "validating Caddyfile"
  run docker run --rm \
    --env-file "$ENV_FILE" \
    -v "${CADDYFILE}:/etc/caddy/Caddyfile:ro" \
    caddy:2.10-alpine \
    caddy validate --config /etc/caddy/Caddyfile
}

preserve_rollback_image() {
  if docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1; then
    log "tagging current image as ${IMAGE_NAME}:${ROLLBACK_TAG}"
    run docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${IMAGE_NAME}:${ROLLBACK_TAG}"
  else
    log "no existing ${IMAGE_NAME}:${IMAGE_TAG} image found; first deploy will not have image rollback"
  fi
}

deploy_stack() {
  log "building and starting production stack"
  run compose_cmd --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build web
  run compose_cmd --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans
}

verify_health() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "would verify ${HEALTH_URL}"
    return 0
  fi

  log "waiting for ${HEALTH_URL}"
  for _ in {1..45}; do
    if curl -fsS "$HEALTH_URL" >/dev/null; then
      log "health check passed"
      return 0
    fi
    sleep 2
  done

  printf 'Health check failed: %s\n' "$HEALTH_URL" >&2
  compose_cmd --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2 || true
  exit 1
}

main() {
  require_file "$COMPOSE_FILE"
  validate_env
  load_env_for_health
  validate_caddy
  preserve_rollback_image
  deploy_stack
  verify_health
  log "deploy complete"
}

main "$@"
