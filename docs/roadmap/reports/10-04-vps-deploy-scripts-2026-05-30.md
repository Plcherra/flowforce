# 10.04 VPS Deploy Scripts

Status: Completed on 2026-05-30.

## Completed

- Added a VPS setup script for Docker, app user, directories, firewall, and env-file creation.
- Added a deploy script that validates env, validates Caddy, tags a rollback image, starts the stack, and verifies health.
- Added a rollback script that restores the rollback image, restarts the stack, and verifies health.
- Kept dry-run support in all three scripts.
- Documented first VPS setup, production env handling, deploy, and rollback.
- Added a local contract check for the VPS deployment script baseline.

## Files

- `infrastructure/scripts/setup-vps.sh`
- `infrastructure/scripts/deploy.sh`
- `infrastructure/scripts/rollback.sh`
- `src/services/infrastructure/vpsDeployScripts.ts`
- `docs/production-vps-deploy.md`
- `scripts/check-vps-deploy-scripts-contract.mjs`

## Verification

- `bash -n infrastructure/scripts/setup-vps.sh`
- `bash -n infrastructure/scripts/deploy.sh`
- `bash -n infrastructure/scripts/rollback.sh`
- `npm run check:vps-deploy-scripts`
- `npm run check:local`

## Next

Phase 10.05 should define database backup, restore, retention, encryption, and a restore drill.
