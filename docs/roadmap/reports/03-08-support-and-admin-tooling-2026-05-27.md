# 03.08 Support And Admin Tooling

Date: 2026-05-27

## Summary

Phase 03.08 adds service-protected support diagnostics and onboarding baseline repair tooling with audit trails and an explicit no-impersonation decision.

## Completed

- Added `support_tool_runs` as an audited support tooling ledger.
- Added an internal tenant support route at `/api/internal/support/tenant`.
- Protected the route with `SUPPORT_ADMIN_TOKEN` and `x-support-token`.
- Added tenant diagnostics for company, owner profile, membership, settings, roles, setup audit events, export records, and legal holds.
- Added dry-run support repair previews.
- Added an executed repair path for onboarding baseline recovery.
- Added `support.tenant_diagnostics_viewed` and `support.tenant_repair_executed` audit events.
- Kept support impersonation blocked for v1 and documented the decision.
- Documented support/admin tooling in `docs/support-admin-tooling.md`.
- Added `npm run check:support` to guard the support tooling contract.

## Verification

- `npm run check:support`
- `npm run check:local`
- `npm run typecheck`
- `npm run build`

## Notes

- The migration must be pushed before support runs can be persisted remotely.
- The route remains unavailable unless `SUPPORT_ADMIN_TOKEN` is configured.
- The first support console UI should consume this route instead of creating new privileged repair paths.
