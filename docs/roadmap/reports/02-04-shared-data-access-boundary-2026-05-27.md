# Phase 02.04 - Shared Data Access Boundary

Date: 2026-05-27

## Summary

Added an additive shared data-access boundary and lightweight service indexes for the highest-value pilot modules.

This does not rewrite existing repositories. It creates a stable place for future module migrations to converge around normalized errors, repository results, query keys, and service barrels.

## Files Added

Shared boundary:

- `src/shared/data-access/errors.ts`
- `src/shared/data-access/repository.ts`
- `src/shared/data-access/queryKeys.ts`
- `src/shared/data-access/index.ts`

Module service indexes:

- `src/features/employees/services/index.ts`
- `src/features/tasks/services/index.ts`
- `src/features/analytics/services/index.ts`

## Files Updated

- `src/lib/queryKeys.ts`
- `src/features/inventory/services/index.ts`
- `src/features/scheduling/services/index.ts`
- `src/features/employees/index.ts`
- `src/features/tasks/index.ts`
- `src/features/analytics/index.ts`

## Data Access Convention

Repositories should own:

- Supabase table/view/RPC calls.
- Select strings and table-specific query shape.
- Zod parsing or row normalization.
- Raw row-to-domain mapping.

Services should own:

- Workflows that compose multiple repositories.
- Domain calculations.
- Cross-table operations.
- Workflow-level validation.

Hooks should own:

- React Query usage.
- Query invalidation.
- UI loading/error state.
- Optimistic updates.
- Toasts and view-model transformation.

Shared data-access helpers should own:

- Cross-module error normalization.
- Repository result wrappers.
- Repository context contracts.
- Shared query-key factories.
- Common success/error assertions.

Server boundaries should own:

- Service-role writes.
- Cron jobs.
- AI/integration/billing/admin writes.
- Sensitive idempotent operations.
- Audit logging for critical mutations.

## Shared Error Handling

`src/shared/data-access/errors.ts` now provides:

- `DataAccessSource`
- `DataAccessErrorContext`
- `DataAccessError`
- `normalizeDataAccessError`
- `throwDataAccessError`
- `isDataAccessError`

The goal is to migrate raw Supabase throws into normalized app errors gradually.

## Repository Helpers

`src/shared/data-access/repository.ts` now provides:

- `RepositoryContext`
- `RepositoryOperationContext`
- `repositoryResult`
- `assertRepositoryData`
- `assertRepositorySuccess`

These helpers let modules choose between thrown errors and `AppResult` style returns while keeping the normalized error shape consistent.

## Query Key Helpers

`src/shared/data-access/queryKeys.ts` now provides:

- `createModuleQueryKey`
- `createUserQueryKey`
- `moduleQueryKeys`

`src/lib/queryKeys.ts` was extended with pilot-module keys for:

- Inventory items, locations, counts, and purchasing.
- Employees directory and invites.
- Tasks list and timeline.
- Analytics KPIs and reports.

## Module Service Indexes

Inventory:

- Existing service index now also exports inventory repository namespaces.

Scheduling:

- Existing service index now also exports scheduling repository namespaces.

Tasks:

- New service index exposes task, reminder, activity, and notification repositories.

Employees:

- New service index exposes the existing employees repository as a stable service surface.

Analytics:

- New service index exposes analytics services from the shared analytics service folder.

## Migration Guidance

Future work should migrate one module at a time:

1. Move direct Supabase calls from hooks into feature repositories where safe.
2. Use shared query keys for new React Query hooks.
3. Normalize thrown Supabase errors with `normalizeDataAccessError` or `throwDataAccessError`.
4. Keep feature-specific view-model types local.
5. Export stable service/repository surfaces from each module service index.
6. Run typecheck and visible-module smoke after each module migration.

## Verification

Commands run:

```bash
npm run typecheck:src
npm run typecheck
```

Result:

- `typecheck:src` passed.
- Full scoped typecheck passed for app, tests, and Supabase scopes.

Smoke note:

- Visible-module smoke was not run in this phase because the change was additive shared code and service barrels. It should run when modules begin migrating runtime imports into this boundary.

## Acceptance Result

- Repository/service patterns defined.
- Supabase error normalization boundary added.
- React Query key normalization helpers added.
- Module service indexes created or strengthened for inventory, scheduling, tasks, employees, and analytics.

## Next Phase

Continue to Phase 02.05: app shell architecture.
