# 03.03 Roles And Permissions Productization

Date: 2026-05-27

## Summary

Phase 03.03 turns roles from scattered legacy defaults into a single product contract for v1 SaaS tenants.

## Completed

- Defined the v1 product role set: owner, admin, manager, staff.
- Added a canonical role and permission source of truth in `productRoleContract.json`.
- Added typed helpers that expand role permissions from the registered permission catalog.
- Removed `supervisor` from the default role matrix and mapped it as a legacy alias to `manager`.
- Normalized legacy role names in permission hooks before resolving access.
- Updated role assignment UI to write canonical `profiles.role`, `profiles.role_id`, and aligned `company_members.role`.
- Added onboarding role reconciliation so completed and repaired tenants end with the four canonical product roles.
- Added `npm run check:roles` to verify sensitive role permission contracts.
- Documented the product role model in `docs/roles-and-permissions.md`.

## Verification

- `npm run check:roles`
- `npm run typecheck`

## Notes

- Existing tenants with `Administrator`, `Employee`, or `Supervisor` records are normalized by the app layer.
- The next security pass should still enforce permission-sensitive routes server-side wherever write APIs mutate protected data.
