#!/usr/bin/env bash
set -Eeuo pipefail

APP_USER="${FLOWFORCE_APP_USER:-flowforce}"
APP_DIR="${FLOWFORCE_APP_DIR:-/opt/flowforce/current}"
DRY_RUN="${FLOWFORCE_DRY_RUN:-0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log() {
  printf '[flowforce setup] %s\n' "$*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] %q ' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

require_root() {
  if [[ "${EUID}" -ne 0 && "$DRY_RUN" != "1" ]]; then
    printf 'setup-vps.sh must run as root. Use sudo or set FLOWFORCE_DRY_RUN=1.\n' >&2
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "docker already installed"
    return 0
  fi

  log "installing Docker engine and Compose plugin"
  run apt-get update
  run apt-get install -y ca-certificates curl gnupg
  run install -m 0755 -d /etc/apt/keyrings

  if [[ "$DRY_RUN" == "1" ]]; then
    log "would install Docker apt repository key and source"
  else
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    . /etc/os-release
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
  fi

  run apt-get update
  run apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  run systemctl enable --now docker
}

prepare_user_and_dirs() {
  log "preparing ${APP_USER} user and ${APP_DIR}"

  if ! id "$APP_USER" >/dev/null 2>&1; then
    run useradd --system --create-home --shell /bin/bash "$APP_USER"
  fi

  run usermod -aG docker "$APP_USER"
  run mkdir -p "$APP_DIR" /opt/flowforce/backups /opt/flowforce/releases
  run chown -R "$APP_USER:$APP_USER" /opt/flowforce
}

prepare_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    log "ufw not installed; skipping firewall setup"
    return 0
  fi

  log "allowing SSH, HTTP, and HTTPS through ufw"
  run ufw allow OpenSSH
  run ufw allow 80/tcp
  run ufw allow 443/tcp
}

prepare_env_template() {
  local env_file="${APP_ROOT}/infrastructure/.env.production"
  local env_template="${APP_ROOT}/infrastructure/.env.production.example"

  if [[ -f "$env_file" ]]; then
    log "production env file already exists"
    return 0
  fi

  log "creating infrastructure/.env.production from template"
  run cp "$env_template" "$env_file"
  run chmod 600 "$env_file"
}

main() {
  require_root
  install_docker
  prepare_user_and_dirs
  prepare_firewall
  prepare_env_template
  log "VPS baseline prepared. Fill infrastructure/.env.production before deploying."
}

main "$@"
