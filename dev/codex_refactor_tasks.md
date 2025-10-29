# Flowforce Refactor Tasks

## Operations

## Task ID: R01
## Category: [BUGFIX]
## Priority: Critical
## Description: `clearWeek` deletes schedules and vendor events without scoping to the active company, so running the action purges data for every tenant.
## Affected Areas: src/contexts/SchedulingContext.tsx
## Proposed Solution: Add `eq('company_id', companyId)` to the schedule and vendor event delete queries and ensure the guard returns early when `companyId` is falsy; update related tests or add coverage for the tenant guard.
## Expected Outcome: Clearing a week only removes the current company's shifts/events and shared environments no longer suffer cross-tenant deletions.
## Estimated Effort: 4h

## Task ID: R02
## Category: [BUGFIX]
## Priority: Critical
## Description: Task queries pull every record because there is no company constraint, exposing other tenants' tasks to any authenticated user with read access.
## Affected Areas: src/hooks/useTasks.tsx
## Proposed Solution: Join tasks to the current profile company (via `profiles.company_id` or stored task company) and gate the select with `.eq('company_id', …)`; create regression tests that confirm other-company tasks are not returned.
## Expected Outcome: Task lists contain only records tied to the signed-in company and RLS policies remain enforceable.
## Estimated Effort: 5h

## Task ID: R03
## Category: [BUGFIX]
## Priority: High
## Description: Daily hours cards in `NextGenSchedulingSystem` parse ISO dates with `new Date(\`\${day}T00:00:00\`)`, which shifts to the prior day in negative timezones, so summaries display off-by-one dates.
## Affected Areas: src/components/scheduling/NextGenSchedulingSystem.tsx
## Proposed Solution: Replace the manual string constructor with `parseISO(day)` or use `utcToZonedTime` before formatting; add a unit test for PST users.
## Expected Outcome: Daily hour summaries render with the correct day label regardless of browser timezone.
## Estimated Effort: 3h

## Task ID: R04
## Category: [OPTIMIZATION]
## Priority: Medium
## Description: `bulkCreateShifts` loops through `upsertShift`, triggering a full `refetchAll` after every insert, resulting in redundant round-trips and sluggish week copy.
## Affected Areas: src/contexts/SchedulingContext.tsx
## Proposed Solution: Introduce a bulk insert pathway (single Supabase `insert` with normalized payloads) and only `refetchAll` once; update `copyWeek` to use the bulk path directly.
## Expected Outcome: Bulk shift creation completes markedly faster and reduces Supabase load.
## Estimated Effort: 6h

## Task ID: R05
## Category: [REFACTOR]
## Priority: Medium
## Description: `useForms` defines `fetchForms` inline without memoisation, generating ESLint hook warnings and risking stale closures when dependencies change.
## Affected Areas: src/hooks/useForms.tsx
## Proposed Solution: Wrap the fetcher in `useCallback`, include it in the effect dependencies, and align the hook with React Query for caching; add a regression test to ensure pagination still works.
## Expected Outcome: Hook warnings disappear, fetches are predictable, and form data stays fresh without redundant network calls.
## Estimated Effort: 3h

## HR & Development

## Task ID: R06
## Category: [BUGFIX]
## Priority: Critical
## Description: Learning catalog/service queries ignore company context, so `fetchLearningCatalog` and related helpers return courses from every tenant.
## Affected Areas: src/services/learning/learningService.ts, src/hooks/learning/useLearningCenter.ts
## Proposed Solution: Thread `companyId` into service calls, add `.eq('company_id', …)` filters on courses/modules/metrics, and update the hook to pass the active company; add integration tests verifying isolation.
## Expected Outcome: Learning center views and metrics only surface data belonging to the signed-in company.
## Estimated Effort: 7h

## Task ID: R07
## Category: [BUGFIX]
## Priority: High
## Description: `fetchAllEnrollments` returns the last 200 enrollments globally, leaking learning progress for other organisations.
## Affected Areas: src/hooks/learning/useLearningCenter.ts
## Proposed Solution: Require a company identifier (or admin guard) before running the query and apply the company filter; restrict non-admin users entirely.
## Expected Outcome: Admin enrollment dashboards respect tenant boundaries and non-admins cannot enumerate foreign enrollments.
## Estimated Effort: 4h

## Task ID: R08
## Category: [BUGFIX]
## Priority: High
## Description: `useEmployees` silently swallows errors when resolving the current profile, then queries the profiles table without a company filter, exposing every active employee on failure.
## Affected Areas: src/hooks/useEmployees.tsx
## Proposed Solution: Handle the `currentProfile` error explicitly, short-circuit until company context exists, and add a fallback that enforces `.eq('company_id', …)` even when context lookup fails.
## Expected Outcome: Employee rosters remain scoped to the company and transient Supabase errors no longer escalate into data leaks.
## Estimated Effort: 4h

## Task ID: R09
## Category: [OPTIMIZATION]
## Priority: High
## Description: `useRecognitions` fetches all `goal_rewards` and filters client-side by metadata, pulling far more rows than necessary.
## Affected Areas: src/hooks/useRecognitions.tsx
## Proposed Solution: Convert the select into a filtered RPC or view (e.g., `.contains('reward_details->metadata->>company_id', companyId)`) and add indexes to support the filter.
## Expected Outcome: Recognition sync runs faster and the Supabase payload remains limited to in-company records.
## Estimated Effort: 5h

## Task ID: R10
## Category: [BUGFIX]
## Priority: Medium
## Description: `mapToLeaderboardEntry` drops entries when the employee is missing from the `useEmployees` cache, causing the leaderboard to omit valid performers.
## Affected Areas: src/features/leaderboard/useLeaderboardData.ts
## Proposed Solution: Fall back to the Supabase row data when the enriched employee lookup fails and add tests covering employees absent from the local roster.
## Expected Outcome: Leaderboard rankings remain complete even when the employee list is stale.
## Estimated Effort: 4h

## Inventory

## Task ID: R11
## Category: [BUGFIX]
## Priority: Critical
## Description: `InventoryService.listItems` lacks a company filter, so the inventory UI can display items from other tenants.
## Affected Areas: src/services/inventory.ts
## Proposed Solution: Accept a company identifier parameter (or resolve from profile) and apply `.eq('company_id', …)` across list queries; update hooks to provide the context.
## Expected Outcome: Inventory lists and analytics only show items owned by the active company.
## Estimated Effort: 4h

## Task ID: R12
## Category: [BUGFIX]
## Priority: Critical
## Description: Transfer listing calls return every record because `listTransfers` omits company scoping.
## Affected Areas: src/services/inventory.ts, src/hooks/inventory/useInventoryTransfers.tsx
## Proposed Solution: Add company-aware filters in the service and ensure the React Query hook passes the current company id.
## Expected Outcome: Inventory transfer history is tenant-safe and does not leak other companies' movements.
## Estimated Effort: 4h

## Task ID: R13
## Category: [BUGFIX]
## Priority: High
## Description: `InventoryTransactionForm` calculates `total_amount` with the pre-conversion quantity, so multi-unit adjustments record incorrect costs.
## Affected Areas: src/components/inventory/InventoryTransactionForm.tsx
## Proposed Solution: Use the normalized (base-unit) quantity when deriving totals and add tests covering converted units.
## Expected Outcome: Transaction totals align with the actual stock movement irrespective of the selected unit.
## Estimated Effort: 3h

## Task ID: R14
## Category: [BUGFIX]
## Priority: High
## Description: Transfer line payloads allow empty `unit_id` strings, which Supabase rejects and yields generic errors; the UI gives no feedback.
## Affected Areas: src/components/inventory/InventoryTransfersPanel.tsx
## Proposed Solution: Enforce a valid unit selection before building the payload, show field-level validation, and prevent submission until resolved.
## Expected Outcome: Users receive clear guidance on missing unit selections and transfers succeed without silent failures.
## Estimated Effort: 4h

## Task ID: R15
## Category: [REFACTOR]
## Priority: Medium
## Description: `useInventoryTransactions` returns `any[]` and lacks tenant filtering, hindering type safety and data isolation.
## Affected Areas: src/hooks/inventory/useInventoryTransactions.tsx
## Proposed Solution: Introduce typed DTOs, add company-aware filters within the query, and propagate the hook contract to consumers.
## Expected Outcome: Inventory transaction consumers gain reliable types and only see in-company records.
## Estimated Effort: 4h

## Accounting / Finance

## Task ID: R16
## Category: [BUGFIX]
## Priority: Critical
## Description: `useManagerFinancialMetrics` aggregates six months of payments/expenses/inventory data without a company filter, exposing global financials.
## Affected Areas: src/hooks/useFinancialManagement.ts
## Proposed Solution: Thread the active company id through the hook and add `.eq('company_id', …)` (or equivalent) to each query; expand coverage to assert tenant isolation.
## Expected Outcome: Financial dashboards reflect only the signed-in company’s ledgers.
## Estimated Effort: 6h

## Task ID: R17
## Category: [BUGFIX]
## Priority: High
## Description: Expense queries in `useExpenses` return every record because company scoping is absent.
## Affected Areas: src/hooks/useExpenses.tsx, src/pages/Expenses.tsx
## Proposed Solution: Join expenses to the employee’s company, add filters, and ensure new expense mutations set `company_id`.
## Expected Outcome: Expense lists and analytics no longer bleed cross-company transactions.
## Estimated Effort: 4h

## Task ID: R18
## Category: [BUGFIX]
## Priority: High
## Description: Rejecting an expense or payment still sets `approved_at`, producing misleading audit trails.
## Affected Areas: src/pages/Expenses.tsx, src/components/payments/PaymentsOverview.tsx
## Proposed Solution: Store rejection metadata in dedicated fields (e.g., `rejected_at`, `rejected_by`) and leave approval columns null when status is `rejected`.
## Expected Outcome: Approval timelines remain accurate and downstream reports can distinguish rejections from approvals.
## Estimated Effort: 3h

## Task ID: R19
## Category: [BUGFIX]
## Priority: Medium
## Description: `ExpenseForm` allows submitting empty categories or non-numeric amounts, leading to `NaN` inserts.
## Affected Areas: src/components/expenses/ExpenseForm.tsx
## Proposed Solution: Add controlled validation (required selects, numeric guarding) and surface user feedback before submission.
## Expected Outcome: Expense creation succeeds consistently and Supabase rejects fewer malformed rows.
## Estimated Effort: 2h

## Task ID: R20
## Category: [BUGFIX]
## Priority: Medium
## Description: `clockedInToday` in `useEmployeeFinancialMetrics` only checks the last event for `clock_in`, so users on break or with `break_start` as the latest entry show as not clocked in.
## Affected Areas: src/hooks/useFinancialManagement.ts
## Proposed Solution: Derive clock-in state by scanning for unmatched `clock_in` vs `clock_out` events and account for interleaved breaks.
## Expected Outcome: Employee dashboards correctly reflect live clock-ins even during active breaks.
## Estimated Effort: 4h

## Analytics & AI

## Task ID: R21
## Category: [BUGFIX]
## Priority: Medium
## Description: `AIInsightsPanel` stores the interval handle as `NodeJS.Timeout`, which is `number` in browsers and causes type mismatches and SSR hydration warnings.
## Affected Areas: src/components/ai/AIInsightsPanel.tsx
## Proposed Solution: Switch to `ReturnType<typeof setInterval>` (or `number`) and audit cleanup logic to avoid lingering timers.
## Expected Outcome: Builds compile without type hacks and timers cleanly tear down.
## Estimated Effort: 2h

## Task ID: R22
## Category: [AI-LOGIC]
## Priority: High
## Description: `useAIActionsFeed` executes heavy scheduling/expense queries even when a user lacks company context, needlessly loading fallback data.
## Affected Areas: src/hooks/useAIActionsFeed.ts
## Proposed Solution: Gate the consolidated queries on `profile?.companyId`, short-circuit when absent, and add tests covering anonymous/demo users.
## Expected Outcome: The AI feed only runs when real data exists, reducing noise and Supabase load.
## Estimated Effort: 4h

## Task ID: R23
## Category: [AI-LOGIC]
## Priority: Critical
## Description: `copilot/rulesEngine.evaluateEmployee` uses the browser Supabase client to read privileged HR tables, bypassing RLS and exposing sensitive data.
## Affected Areas: src/copilot/rulesEngine.ts
## Proposed Solution: Move the evaluation into a Supabase function or server route with service-key privileges and call it from the client; add permission checks.
## Expected Outcome: Copilot evaluations run server-side with proper access control, keeping sensitive HR data off the client.
## Estimated Effort: 8h

## Task ID: R24
## Category: [AI-LOGIC]
## Priority: High
## Description: `summarizeWeeklyReports` loops through employees client-side and performs per-employee upserts, which is slow and fails without elevated privileges.
## Affected Areas: src/copilot/summarizeReports.ts
## Proposed Solution: Implement the summarisation as a Supabase RPC or scheduled edge function that performs set-based updates.
## Expected Outcome: Weekly report summaries run efficiently with appropriate credentials.
## Estimated Effort: 6h

## Task ID: R25
## Category: [AI-LOGIC]
## Priority: Critical
## Description: `buildClosedLoopState` scopes events and schedules by company but leaves tasks, time-off requests, and shift swaps unfiltered, pulling other tenants' records into AI insights.
## Affected Areas: src/services/intelligence/closedLoopEngine.ts
## Proposed Solution: Apply company filters to every supporting query and add regression coverage for mixed-tenant datasets.
## Expected Outcome: Closed-loop analytics only analyse the active company’s operations.
## Estimated Effort: 6h

## Admin & Setup

## Task ID: R26
## Category: [BUGFIX]
## Priority: High
## Description: `useCompanyRoles` falls back to permissive default roles when the RPC fails (e.g., due to missing company), granting pseudo-permissions during onboarding.
## Affected Areas: src/hooks/useCompanyRoles.tsx
## Proposed Solution: Surface an explicit error state instead of injecting defaults, and gate the fallback behind an onboarding flag with minimal permissions.
## Expected Outcome: Permission checks no longer assume elevated abilities when role data is unavailable.
## Estimated Effort: 4h

## Task ID: R27
## Category: [BUGFIX]
## Priority: Critical
## Description: Admin profile fetches (`useProfiles`, `useCompanyRolesSnapshot`) do not filter by company, so administrators can list every user in the system.
## Affected Areas: src/hooks/useRoles.tsx, src/pages/Settings.tsx
## Proposed Solution: Scope the queries with the current company id and extend RLS policies if necessary.
## Expected Outcome: Admin consoles only enumerate users within the active tenant.
## Estimated Effort: 4h

## Task ID: R28
## Category: [BUGFIX]
## Priority: High
## Description: `useSaveUserPermissions` deletes overrides before inserting replacements without a transaction; a failure leaves the user with no overrides.
## Affected Areas: src/hooks/useUserPermissions.tsx
## Proposed Solution: Wrap delete/insert in a single Supabase RPC or use `upsert` semantics with temporary storage, and add audit tests.
## Expected Outcome: Permission overrides update atomically and users do not lose settings on partial failures.
## Estimated Effort: 6h

## Task ID: R29
## Category: [BUGFIX]
## Priority: Medium
## Description: The `useToast` effect depends on `state`, causing repeated listener registration and memory growth.
## Affected Areas: src/hooks/use-toast.ts
## Proposed Solution: Change the `useEffect` dependency array to `[]` (and reference a stable setter) so the listener registers only once.
## Expected Outcome: Toast subscriptions remain bounded and hooks stop issuing ESLint warnings.
## Estimated Effort: 2h

## Task ID: R30
## Category: [BUGFIX]
## Priority: Critical
## Description: Generated Supabase types contain a syntax error near notifications relationships (line ~5279), breaking TypeScript builds.
## Affected Areas: src/integrations/supabase/types.ts
## Proposed Solution: Regenerate the types via `supabase gen types typescript` (or fix the trailing comma) and commit the corrected file.
## Expected Outcome: TypeScript compilation succeeds and linting no longer reports a parsing error.
## Estimated Effort: 3h

## Summary Table

| Section | #Tasks | Priority Breakdown | Est. Total Hours | Notes |
| --- | --- | --- | --- | --- |
| Operations | 5 | 2 Critical / 1 High / 2 Medium | 21 | Focus on scheduling/task data safety and hook hygiene. |
| HR & Development | 5 | 1 Critical / 3 High / 1 Medium | 24 | Lock down learning/employee data and stabilise recognition feeds. |
| Inventory | 5 | 2 Critical / 2 High / 1 Medium | 19 | Enforce tenant scoping and fix costing/validation gaps. |
| Accounting / Finance | 5 | 1 Critical / 2 High / 2 Medium | 19 | Scope financial queries, correct approval logic, tighten validation. |
| Analytics & AI | 5 | 2 Critical / 2 High / 1 Medium | 26 | Move AI workloads server-side and eliminate cross-tenant leakage. |
| Admin & Setup | 5 | 2 Critical / 2 High / 1 Medium | 19 | Harden role/permission tooling and resolve Supabase type errors. |
| **Total** | **30** | **10 Critical / 11 High / 9 Medium** | **128** | Staged execution recommended: address Critical issues before enhancements. |
