# Phase 02.03 - Shared Type Boundary

Date: 2026-05-27

## Summary

Created the first shared platform type boundary without forcing a broad feature refactor.

This gives future architecture phases a stable import target for tenant, profile, permission, module, API result, and error contracts while preserving current module behavior.

## Files Added

- `src/types/platform.ts`
- `src/types/index.ts`

## Contracts Added

Supabase generated-type helpers:

- `SupabaseTableName`
- `SupabaseViewName`
- `SupabaseFunctionName`
- `TableRow<TTable>`
- `TableInsert<TTable>`
- `TableUpdate<TTable>`
- `ViewRow<TView>`

Core row aliases:

- `CompanyRow`
- `CompanyMemberRow`
- `CompanyRoleRow`
- `ProfileRow`

Tenant and identity contracts:

- `CompanyId`
- `UserId`
- `MemberId`
- `RoleId`
- `UserRole`
- `TenantScopedRecord`
- `UserScopedRecord`
- `TenantContextContract`

Summary contracts:

- `CompanySummary`
- `ProfileSummary`
- `RoleSummary`

Module contracts:

- `ModuleSlug`
- `ModuleLifecycle`
- `ModuleVisibilityReason`
- `ModuleVisibilityContract`

API/error contracts:

- `AppError`
- `AppResult<TData, TError>`
- `ApiSuccess<TData>`
- `ApiFailure<TError>`
- `ApiResult<TData, TError>`

## Alignment Decision

The boundary imports the generated Supabase `Database` type from `src/integrations/supabase/types.ts`, so app-level aliases can point at generated schema contracts.

The boundary imports `PermissionKey` from `src/lib/permissions/registry.ts`, so it does not create a second permission key universe.

## Duplicate Type Decision

No broad duplicate deletion was safe in this phase.

Reason:

- Profile, company, role, permission, module, API result, and error-like types are still declared across hooks, feature folders, shared files, and server utilities.
- Removing them before import migration would create unnecessary blast radius.

Safe migration order:

1. Tenant/auth/permission contracts.
2. App shell and module visibility.
3. Employees/team profile summaries.
4. Scheduling and tasks.
5. Inventory and purchasing.
6. Reports/analytics and AI.

## Product Implication

Future modules should prefer `src/types/platform.ts` for cross-module contracts.

Feature-local types should remain local only when they describe feature-specific view models, form state, wizard state, or UI-only data.

## Verification

Command run:

```bash
npm run typecheck:src
```

Result:

- Passed.

## Acceptance Result

- Shared type exports created.
- Tenant, profile, permission, module, API result, and error contracts defined.
- Supabase generated types aligned with app-level helper aliases.
- Duplicate type removals deferred where broad removal would be risky.

## Next Phase

Continue to Phase 02.04: shared data access boundary.
