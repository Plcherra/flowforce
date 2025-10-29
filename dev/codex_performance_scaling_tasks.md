# Performance Scaling Tasks

## Network Load Profile
- **High** Dashboard metrics fan-out (`src/hooks/useDashboardData.tsx:40`) issues five sequential Supabase reads (profiles, departments, schedules, time off twice) with no tenant filter, causing full-table scans on every mount. Share `companyId` from `ProfileContext`, send a single RPC that returns the aggregated counts, and batch the read with `Promise.all` while the RPC is being built.
- **High** Analytics summary (`src/hooks/useAnalytics.tsx:26` & `src/hooks/useAnalytics.tsx:87`) performs eight standalone `count(*)` requests followed by an N+1 loop over every profile to count tasks. Replace with a materialized view or RPC that groups by `company_id`/`status`, then hydrate the React Query cache with the result.
- **High** Scheduling provider (`src/hooks/scheduling/useSchedulingConsolidated.ts:104`) downloads the entire team roster, then fans out to assignments, time off, and unavailability with `.in()` filters on every refetch. Add tenant-scoped range filters (week window for time off/unavailability) and hydrate the context from a pre-computed schedule snapshot API.
- **Medium** Employee intelligence panel (`src/hooks/useEmployees.tsx:78`) hydrates employees and then queries four supporting tables with large `IN` clauses. Convert the enrichment step to a server-side view that joins the skill/badge/performance rollups and returns capped 30-day aggregates.
- **Medium** Channel messaging (`src/hooks/messages/useChannelMessages.tsx:20`) re-fetches the full message history on every insert notification. Switch to incremental append (only fetch the new row via payload) and cap the initial fetch with pagination.
- **Medium** Financial dashboards (`src/hooks/useFinancialManagement.ts:265` & `src/hooks/useFinancialManagement.ts:548`) pull six months of payments/expenses/inventory rows on every tab visit. Introduce date bucketing (month granularity) and local caching keyed by `(companyId, period)` so charts reuse hydrated data.
- **Medium** External Connecteam bridge (`src/integrations/connecteam/forms.ts:30`) calls the REST API with no caching. Persist responses in Supabase storage (or KV) keyed by date window and add conditional requests (ETag/If-Modified-Since) when the upstream supports it.

## Database Load Profile
- **High** Task and goal analytics (`src/services/analytics/businessAnalyticsService.ts:334-408`) aggregate schedules, tasks, goals, inventory transactions, and expenses with broad limits. Without composite indexes on `company_id` and date columns, these reads devolve into sequential scans under load.
- **High** Scheduling mutations (`src/hooks/scheduling/useSchedulingConsolidated.ts:199-235`) depend on quick lookups by `schedule_id`, `user_id`, and time ranges; missing secondary indexes turn each `.in()` clause into repeated bitmap scans as the team grows.
- **Medium** Employee enrichment (`src/hooks/useEmployees.tsx:116-140`) relies on `skill_matrix`, `employee_badge`, `employee_report`, and `staff_performance` date filters. These tables need composite indexes on `(employee_id,date)` to keep the 30-day lookups bounded.
- **Medium** Messaging stream (`src/hooks/messages/useChannelMessages.tsx:24-34`) reads channel history ordered by `created_at`. Add a covering index `(channel_id, created_at DESC)` to keep pagination responsive.
- **Medium** Financial snapshots (`src/hooks/useFinancialManagement.ts:548-579`) scan `payments`, `expenses`, `inventory_transactions`, and `inv_waste` by `company_id`/`created_at`. The tables should expose matching indexes (and optionally partitions) to keep monthly refreshes predictable.

## Query Index Recommendations
1. **P0** `profiles_company_status_idx` for tenant + status lookups in employees and analytics.  
   ```sql
   create index concurrently if not exists profiles_company_status_idx
     on public.profiles (company_id, employment_status);
   ```
2. **P0** `schedules_company_start_idx` to accelerate weekly schedule windows (`src/hooks/scheduling/useSchedulingConsolidated.ts:148`).  
   ```sql
   create index concurrently if not exists schedules_company_start_idx
     on public.schedules (company_id, start_time);
   ```
3. **P0** `schedule_assignments_schedule_idx` for `.in(schedule_id)` joins (`src/services/analytics/businessAnalyticsService.ts:366`).  
   ```sql
   create index concurrently if not exists schedule_assignments_schedule_idx
     on public.schedule_assignments (schedule_id);
   ```
4. **P0** `time_off_requests_user_created_idx` to back user-centric history (`src/hooks/scheduling/useSchedulingConsolidated.ts:214`).  
   ```sql
   create index concurrently if not exists time_off_requests_user_created_idx
     on public.time_off_requests (user_id, created_at desc);
   ```
5. **P0** `user_unavailability_user_start_idx` for availability ranges (`src/hooks/scheduling/useSchedulingConsolidated.ts:225`).  
   ```sql
   create index concurrently if not exists user_unavailability_user_start_idx
     on public.user_unavailability (user_id, start_time);
   ```
6. **P1** `employee_report_employee_date_idx` to support 30-day sentiment reads (`src/hooks/useEmployees.tsx:126`).  
   ```sql
   create index concurrently if not exists employee_report_employee_date_idx
     on public.employee_report (employee_id, date);
   ```
7. **P1** `messages_channel_created_idx` for chronological channel fetches (`src/hooks/messages/useChannelMessages.tsx:33`).  
   ```sql
   create index concurrently if not exists messages_channel_created_idx
     on public.messages (channel_id, created_at desc);
   ```
8. **P1** `payments_company_created_status_idx` to cover finance dashboards (`src/hooks/useFinancialManagement.ts:548`).  
   ```sql
   create index concurrently if not exists payments_company_created_status_idx
     on public.payments (company_id, created_at desc, status);
   ```
9. **P1** `inventory_transactions_company_created_idx` for manager metrics (`src/hooks/useFinancialManagement.ts:559`).  
   ```sql
   create index concurrently if not exists inventory_transactions_company_created_idx
     on public.inventory_transactions (company_id, created_at desc);
   ```

## Cache Strategy Tasks
- **P0** Ship an `analytics_snapshot(company_id uuid)` RPC (or materialized view) that returns the dashboard, task, and goal counts in one call; point `useAnalytics` and `useDashboardData` at the shared endpoint and hydrate TanStack Query with a 5–10 minute `staleTime`.
- **P0** Add a `useSupabaseQuery` helper that injects `companyId` filters and response memoization, then migrate manual hooks (`useDashboardData`, `useEmployeePerformance`, `useEmployees`) to it so repeated mounts reuse cached responses.
- **P0** Introduce client-side pagination + `initialData` for messaging hooks; keep an LRU cache keyed by `(channelId, page)` to avoid replaying the entire history when a subscription fires.
- **P1** Persist Connecteam responses to `integration_cache` (table or storage bucket) with a `refreshed_at` column; hydrate UI from cache first, then revalidate in the background.
- **P1** Materialize monthly finance aggregates (total payroll, expenses, waste) into a summary table refreshed nightly so `useManagerFinancialMetrics` pulls at most 30 rows instead of thousands.
- **P1** Store scheduling snapshots per week in Supabase storage/kv; let `useSchedulingConsolidated` warm the cache and only diff updates (assign/unassign) instead of re-downloading all relations.

## Component Lazy-Loading Steps
- **P0** Split heavy financial charts in `src/pages/Expenses.tsx:31-33` into lazy modules: wrap `EmployeeFinancialOverview` and `ManagerFinancialOverview` with `React.lazy` and guard them behind tab-based `Suspense` so the charts load only when the corresponding tab is activated.
- **P0** In `src/components/scheduling/NextGenSchedulingSystem.tsx:19-47`, convert `EnhancedCalendarView`, `AIInsightsDashboard`, `SchedulingWorkflow`, `SchedulingNotifications`, and availability panels into lazy imports keyed off `activeTab`. Provide lightweight placeholder skeletons to keep initial bundle size down.
- **P1** Wrap analytics visualizations (`src/components/analytics/BusinessAnalyticsBoard.tsx:44`) in a lazy boundary so the initial `/app/analytics` route loads the board only after `useBusinessAnalytics` resolves; prefetch the module when the route is hovered in the navigation.
- **P1** Defer charting libs (`recharts`) by extracting them into a dedicated chunk and dynamically importing inside both financial overview components to reduce the base bundle.

