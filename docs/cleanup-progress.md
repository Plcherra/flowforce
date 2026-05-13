# Cleanup Progress

## Phase 1: Immediate Cleanup

- [x] Removed Vite/Vitest config files and old React stylesheet entry files.
- [x] Removed the `npm run test` Vitest script.
- [x] Removed Vite/Vitest-only dependencies from `package.json`.
- [x] Removed `lovable-tagger` because it pulled Vite into the dependency tree.
- [x] Consolidated `src/components/company-updates/` into `src/features/company-updates/`.
- [x] Consolidated `src/components/updates/` into `src/features/company-updates/wizard/`.
- [x] Updated imports for moved Company Updates files.

**Blockers / notes:**

- Legacy Vitest test files still exist under `src/**/__tests__` and `*.test.*`. They are excluded from TypeScript compilation for now and should be migrated to the Next.js test approach later.
- `npm run typecheck` still fails because of broad existing schema/type issues outside Phase 1 cleanup.
- `npm run lint` now runs through ESLint directly, but it still fails on existing lint errors across the repo.

**Next action:**

- Refactor `src/features/company-updates/pages/CompanyUpdates.tsx` into smaller page sections.

## Phase 2: Restructure Folders

- [x] Make `src/components/` shared-only.
- [x] Move app shell code into `src/app-shell/`.
- [x] Removed the legacy `src/screens/` route layer.
- [x] Replaced remaining `react-router-dom` imports with the Next router adapter.
- [x] Removed the `react-router-dom` dependency.
- [x] Merge duplicate feature areas.

**Completed Phase 2 details:**

- Moved `src/components/AppShell.tsx` to `src/app-shell/AppShell.tsx`.
- Moved `src/components/AppSidebar.tsx` to `src/app-shell/navigation/AppSidebar.tsx`.
- Moved `src/components/layout/TopNavbar.tsx` to `src/app-shell/layout/TopNavbar.tsx`.
- Moved `src/components/navigation/*` to `src/app-shell/navigation/*`.
- Moved `src/components/sidebar/AddNewSectionButton.tsx` to `src/app-shell/navigation/sidebar/AddNewSectionButton.tsx`.
- Updated app shell imports in `app/app/AppLayoutClient.tsx` and moved shell files.
- Moved `src/components/dashboard/*` to `src/features/dashboard/components/*`.
- Updated dashboard imports in `src/screens/Dashboard.tsx`.
- Moved `src/components/employees/*` to `src/features/employees/components/*`.
- Updated employee imports in `src/features/employees/components/TeamDirectory.tsx`.
- Moved `src/components/tasks/*` to `src/features/tasks/components/*`.
- Updated task imports in `src/features/tasks/pages/Tasks.tsx` and analytics task dialog usage.
- Moved `src/components/messages/*` to `src/features/messages/components/*`.
- Updated message imports in the messages layout, header, modal, and moved message components.
- Moved `src/components/analytics/*` to `src/features/analytics/components/*`.
- Moved `src/components/operations/*` to `src/features/operations/components/idea/*`.
- Moved `src/components/positions/*` to `src/features/positions/components/*`.
- Moved role management files from `src/components/roles/*` to `src/features/roles/components/*` and removed the old `SectionPermissionsTab` re-export wrapper.
- Moved admin tab/audit files from `src/components/admin/*` to `src/features/admin/components/*` and removed the old `UserManagement` re-export wrapper.
- Moved `src/components/availability/*` to `src/features/availability/components/*`.
- Moved report builder/viewer files from `src/components/reports/*` to `src/features/analytics/components/reports/builder/*`.
- Moved payments/financial overview files from `src/components/payments/*` and `src/components/financial/*` to `src/features/inventory/components/expenses/*`.
- Moved reminders files from `src/components/reminders/*` to `src/features/tasks/components/reminders/*`.
- Moved `src/components/forms/*` to `src/features/forms/components/*`.
- Moved `src/components/inventory/*` to `src/features/inventory/components/*`.
- Moved `src/components/learning/*` to `src/features/learning/components/*`.
- Moved `src/components/sections/*` to `src/features/sections/components/*`.
- Removed a stale `react-refresh/only-export-components` eslint directive from the moved sections registry.
- Moved `src/components/scheduling/*` to `src/features/scheduling/components/*`.
- Removed the old `src/components/scheduling/DragDropScheduleCalendar.tsx` re-export wrapper.
- Fixed missing imports in moved scheduling files that surfaced during focused ESLint.
- Moved `src/components/ai/*` to `src/features/ai/components/*`.
- Moved event components from `src/components/events/*` to `src/features/calendar/components/*` and removed old event re-export wrappers.
- Moved `src/components/expenses/ExpenseForm.tsx` to `src/features/inventory/components/expenses/ExpenseForm.tsx`.
- Moved `src/components/cookbook/*` to `src/features/inventory/components/cookbook/*`.
- Moved `src/components/announcements/*` to `src/features/messages/components/announcements/*`.
- Moved `src/components/users/*` and `src/components/people/EngagementPanel.tsx` to `src/features/employees/components/users/*`.
- Moved `src/components/auth/*` to `src/features/auth/components/*`.
- Moved `src/components/landing/*` to `src/features/marketing/components/*`.
- Moved `src/components/illustrations/*` to `src/features/marketing/components/illustrations/*`.
- Moved `src/components/onboarding/*` to `src/features/onboarding/components/*`.
- Moved `src/components/profile/*` to `src/features/profile/components/*`.
- Moved `src/components/resources/*` to `src/features/resources/components/*`.
- Moved `src/components/templates/*` to `src/features/templates/components/*`.
- Moved remaining top-level app/domain components from `src/components/*.tsx` into `src/app-shell/*` or owning feature folders.
- Moved active route screens into feature-owned page folders for dashboard, employees, tasks, messages, company updates, forms, goals, auth, profile, onboarding, marketing, templates, resources, inventory, calendar/events, help desk, operations, sections, permissions, and HR development.
- Removed duplicate legacy `src/screens/*` copies after verifying active routes import canonical feature pages.
- Moved the old `src/screens/api/ops/issues/[issueId]/suggest-automation.ts` handler to `app/api/ops/issues/[issueId]/suggest-automation/route.ts`.
- Replaced the old router-adapter-based Not Found screen with a static App Router `app/not-found.tsx` page.
- Moved old `src/screens/__tests__` files next to their feature owners.
- Replaced remaining `react-router-dom` imports with `src/lib/router-adapter.tsx` and added a lightweight `MemoryRouter` compatibility export for existing tests.
- Removed `react-router-dom` from `package.json` and `package-lock.json`.
- Fixed lint errors surfaced during the structural move: missing UI/icon imports, `require()` imports, one logger switch case declaration, and one test display-name issue.
- Merged `src/features/recognitions/*` into `src/features/recognition/*` and removed the plural feature folder.
- Moved root-level `src/availability/*` utilities and tests into `src/features/availability/utils/*`.
- Moved `src/modules/operations/*` into `src/features/operations/*` and removed the operations module folder.
- Moved `src/modules/system/*` into `src/features/system/*` and removed `src/modules/`.
- Merged standalone `src/features/leaderboard/*` into `src/features/gamification/leaderboard/*`.
- Moved the sidebar primitive implementation from `src/features/ui/components/sidebar.tsx` back into `src/components/ui/sidebar.tsx` and removed `src/features/ui/`.
- Fixed a messages build collision where `src/features/messages/components/conversations.ts` shadowed the `conversations/` component folder.
- Added a Suspense boundary around the protected app shell so router-adapter search param usage is valid during Next.js prerendering.

**Current Phase 2 verification:**

- `npm run lint` passes. The repo still has many warnings, but zero lint errors.
- `npx eslint . --ext .js,.jsx,.ts,.tsx --quiet` passes.
- `npm run build` passes.
- Duplicate feature/module folders removed: `src/features/recognitions`, `src/features/leaderboard`, `src/features/ui`, `src/availability`, and `src/modules`.
- No legacy structural imports remain for `@/modules`, `@/screens`, `@/availability`, `react-router-dom`, `@/features/recognitions`, or `@/features/leaderboard`.
- `npm run typecheck` was attempted, but it ran for several minutes without output and had to be stopped. Typecheck remains a known slow/broad verification blocker.
- `src/screens/` is removed.
- There are no remaining `@/screens` imports.
- There are no remaining `react-router-dom` imports.
- Active code imports for the moved component groups have been updated away from `@/components/*`.
- Remaining `src/components/` usage is limited to shared folders: `ui/`, `common/`, `loading/`, and `permissions/`.

## Phase 3: Component & Code Quality

- [x] Refactor `CompanyUpdates.tsx`.
- [x] Add shared missing-backend handling.
- [x] Create standard feature state components.
- [x] Replace React Router imports in touched files.

**Completed Phase 3 details:**

- Split `src/features/company-updates/pages/CompanyUpdates.tsx` into feature-owned section components:
  - `src/features/company-updates/components/CompanyUpdatesFeedSection.tsx`
  - `src/features/company-updates/components/CompanyUpdatesGridSection.tsx`
  - `src/features/company-updates/components/CompanyUpdatesListSection.tsx`
  - `src/features/company-updates/components/CompanyUpdatesPagination.tsx`
  - `src/features/company-updates/components/CompanyUpdatesSetupState.tsx`
  - `src/features/company-updates/components/CompanyUpdatesSkeletons.tsx`
- Moved Supabase missing-resource detection into `src/shared/utils/supabaseErrors.ts`.
- Added shared feature state components:
  - `src/shared/components/FeatureLoadingState.tsx`
  - `src/shared/components/FeatureErrorState.tsx`
  - `src/shared/components/FeatureSetupRequiredState.tsx`
  - `src/shared/components/FeatureEmptyState.tsx`
- Wired `FeatureSetupRequiredState` into the Company Updates missing-backend state.
- Applied the shared missing-backend pattern to Calendar:
  - `src/features/calendar/components/NetworkStatusBanner.tsx`
  - `src/features/calendar/pages/events/EventsHub.tsx`
- Applied the shared missing-backend pattern to Scheduling:
  - `src/hooks/scheduling/useSchedulingConsolidated.ts`
  - `src/features/scheduling/components/NextGenSchedulingSystem.tsx`
  - `src/features/scheduling/components/SchedulingCalendar.tsx`
  - `src/features/scheduling/pages/ScheduleLobby.tsx`
- Kept `CompanyUpdates.tsx` focused on hooks, derived state, event handlers, and high-level layout.

**Current Phase 3 verification:**

- Focused ESLint for the touched Phase 3 files passes.
- `npm run build` passes after Company Updates changes.
- `npm run build` passes after Calendar changes.
- `npm run build` passes after Scheduling changes.
- Verification policy is finalized: focused ESLint plus `npm run build` are the per-batch gates. `npm run typecheck` remains a milestone/overnight check because it is too slow and broad for each cleanup batch.

## Phase 4: Final Polish

- [x] Continue migrating `src/screens/` route by route.
- [x] Clean root-level shared folders as features are touched.
- [x] Remove unused dependencies after imports are gone.
- [x] Add smoke tests for visible modules.
- [x] Add a Supabase contract check.

**Completed Phase 4 details:**

- Added `scripts/check-supabase-contract.mjs`.
- Added `npm run check:supabase`.
- The contract check verifies required Supabase relations for visible modules and read-style RPCs.
- Mutating RPCs are listed as manual checks and are not executed by the script.
- Removed unused Capacitor packages from `package.json` and `package-lock.json`.
- Removed remaining project `.DS_Store` files outside `.git/` and `node_modules/`.
- Confirmed legacy structural folders are absent: `src/screens/`, `src/components/company-updates/`, `src/components/updates/`, `src/features/recognitions/`, `src/availability/`, and `src/modules/`.
- Added `scripts/smoke-visible-modules.mjs`.
- Added `npm run test:smoke`.
- Smoke test output is saved to `docs/test-results/visible-modules-smoke.json`.
- Completed Phase 4 root cleanup Batch 1:
  - moved `src/repositories/companyUpdatesRepository.ts` to `src/features/company-updates/repositories/companyUpdatesRepository.ts`
  - updated Company Updates hooks to import from the feature-owned repository path
- Completed Phase 4 root cleanup Batch 2:
  - moved `src/repositories/messagesRepository.ts` to `src/features/messages/api/messagesRepository.ts`
  - removed root `src/hooks/messages/*` wrappers because the feature-owned hooks already existed
  - updated Messages API, hook, component, and test imports to use feature-owned paths
- Completed Phase 4 root cleanup Batch 3:
  - moved `src/hooks/useCookbook.tsx` to `src/features/inventory/hooks/useCookbook.tsx`
  - moved `src/services/cookbook.ts` to `src/features/inventory/services/cookbook.ts`
  - moved `src/services/financialDemoData.ts` to `src/features/inventory/services/financialDemoData.ts`
  - updated cookbook and financial demo imports to use feature-owned inventory paths
- Completed Phase 4 root cleanup Batch 4:
  - moved `src/hooks/useForms.tsx` to `src/features/forms/hooks/useForms.tsx`
  - moved `src/repositories/formsRepository.ts` to `src/features/forms/repositories/formsRepository.ts`
  - removed root `src/services/forms/formImportService.ts` wrapper because the feature-owned service already existed
  - updated Forms, Analytics, and related test imports to use feature-owned forms paths
- Completed Phase 4 root cleanup Batch 5:
  - moved `src/hooks/scheduling/*` to `src/features/scheduling/hooks/*`
  - moved `src/repositories/schedulingRepository.ts` to `src/features/scheduling/repositories/schedulingRepository.ts`
  - moved `src/repositories/shiftSwapsRepository.ts` to `src/features/scheduling/repositories/shiftSwapsRepository.ts`
  - moved `src/repositories/copilotRepository.ts` to `src/features/scheduling/repositories/copilotRepository.ts`
  - removed deprecated wrapper `src/hooks/useSchedulingConsolidated.ts`
  - updated scheduling, calendar, AI feed, positions, utility, context, component, and test imports to use feature-owned scheduling paths

**Current Phase 4 verification:**

- `npm run check:supabase` passes with 0 missing relations and 0 missing read RPCs.
- `npm run test:smoke` passes against a local production server on port 3001.
- Focused ESLint for the Phase 4 scripts passes.
- `npm run build` passes after the Phase 4 script/dependency changes.
- Focused ESLint for Phase 4 Batch 1 Company Updates files passes.
- `npm run build` passes after Phase 4 Batch 1.
- Focused ESLint for Phase 4 Batch 2 Messages files passes.
- `npm run build` passes after Phase 4 Batch 2.
- Focused ESLint for Phase 4 Batch 3 Inventory files passes.
- `npm run build` passes after Phase 4 Batch 3.
- Focused ESLint for Phase 4 Batch 4 Forms files passes.
- `npm run build` passes after Phase 4 Batch 4.
- Focused ESLint for Phase 4 Batch 5 Scheduling files passes.
- `npm run build` passes after Phase 4 Batch 5.
- Deferred manual review completed:
  - Tasks root hooks stay as compatibility exports for now; task repositories should be handled in a dedicated Tasks batch.
  - Learning service implementation now lives in `src/features/learning/services/learningService.ts`; root service is a compatibility export.
  - Performance service/hook/repository ownership stays shared because Analytics and Performance both consume it.
  - Employee repository moved to `src/features/employees/repositories/employeesRepository.ts`; root `useEmployees` stays as the cross-feature compatibility export.
  - Unused root scheduling/guardrail service wrappers were removed after confirming active imports use feature-owned scheduling service paths.
- Focused ESLint for the deferred review code changes passes with existing warnings only in Learning service/test files.
- `npm run build` passes after the deferred review cleanup.
- `npm run check:supabase` passes with 0 missing relations and 0 missing read RPCs.
- `npm run test:smoke` passes after starting a local production server on port 3000.

**Next Phase 4 action:**

- Plan a dedicated Tasks cleanup batch before moving task repositories because Tasks has wider AI, Analytics, Goals, and test coverage.
