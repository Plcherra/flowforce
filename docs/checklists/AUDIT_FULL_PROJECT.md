# Full Project Cleanup Action Plan

Goal: keep the full FlowForce product scope while cleaning the existing structure. This plan matches the current codebase shape: `app-shell/`, `components/`, `features/`, `hooks/`, `lib/`, `screens/`, `shared/`, `types/`, `utils/`, and Supabase code. The cleanup should consolidate duplicate ownership, not remove major features.

## Phase 1: Immediate Cleanup (High Impact)

Goal: remove obvious legacy leftovers and consolidate the active Company Updates module first.

- [x] **Remove Vite/Vitest and old React leftovers**
  - **Delete these files if they exist:**
    - `src/App.css`
    - `src/index.css`
    - `src/main.tsx`
    - `src/App.tsx`
    - `src/vite-env.d.ts`
    - `index.html`
    - `vite.config.ts`
    - `vitest.config.ts`
    - `vitest.setup.ts`
  - **Update after deletion:**
    - remove any `vitest` scripts from `package.json`
    - remove Vite/Vitest-only dependencies from `package.json`
    - migrate any remaining tests to the Next.js test approach chosen for the project
  - **Verification:** run `rg "App.css|index.css|main.tsx|vite-env|vite.config|vitest" .` after cleanup and confirm no active app code depends on them.
  - **Why it matters:** FlowForce is moving fully to Next.js. Vite and Vitest should not remain as parallel tooling.

- [x] **Consolidate `components/company-updates` into `features/company-updates`**
  - **Move:**
    - `src/components/company-updates/EngagementOverview.tsx` -> `src/features/company-updates/components/EngagementOverview.tsx`
  - **Then update imports from:**
    - `@/components/company-updates/EngagementOverview`
  - **To:**
    - `@/features/company-updates/components/EngagementOverview`
  - **Verification:** run `rg "@/components/company-updates|components/company-updates" src app`.
  - **Why it matters:** Company Updates already has a feature folder. Related UI should live there.

- [x] **Consolidate `components/updates` into the existing Company Updates wizard**
  - **Move:**
    - `src/components/updates/CreateUpdateWizard.tsx` -> `src/features/company-updates/wizard/CreateUpdateWizard.tsx`
    - `src/components/updates/steps/DesignContentStep.tsx` -> `src/features/company-updates/wizard/steps/DesignContentStep.tsx`
    - `src/components/updates/steps/PublishSettingsStep.tsx` -> `src/features/company-updates/wizard/steps/PublishSettingsStep.tsx`
    - `src/components/updates/steps/RecipientsStep.tsx` -> `src/features/company-updates/wizard/steps/RecipientsStep.tsx`
    - `src/components/updates/steps/SummaryStep.tsx` -> `src/features/company-updates/wizard/steps/SummaryStep.tsx`
    - `src/components/updates/steps/TemplateSelectionStep.tsx` -> `src/features/company-updates/wizard/steps/TemplateSelectionStep.tsx`
  - **Then update imports from:**
    - `@/components/updates/CreateUpdateWizard`
    - `@/components/updates/steps/*`
  - **To:**
    - `@/features/company-updates/wizard/CreateUpdateWizard`
    - `@/features/company-updates/wizard/steps/*`
  - **Verification:** run `rg "@/components/updates|components/updates" src app`.
  - **Why it matters:** The wizard is part of Company Updates. Keeping it in `src/components/updates` makes ownership unclear.

- [x] **Create a simple cleanup tracker**
  - **Create:** `docs/cleanup-progress.md`
  - **Add four sections:**
    - Phase 1: Immediate Cleanup
    - Phase 2: Restructure Folders
    - Phase 3: Component & Code Quality
    - Phase 4: Final Polish
  - **Track only completed work, blockers, and next action.**
  - **Why it matters:** This gives the cleanup effort a short progress file instead of turning the audit plan into status notes.

---

## Phase 2: Restructure Folders

Goal: keep the current structure, but make ownership clear. Do not move everything at once. Move one feature area at a time and verify imports after each batch.

Current target structure:

```txt
src/
  app-shell/      # app frame, layout, sidebar, navigation
  components/     # shared UI only, especially components/ui
  features/       # business modules
  hooks/          # truly shared hooks only
  lib/            # shared app libraries and adapters
  shared/         # shared components, utils, and cross-feature helpers
  types/          # global app/domain types
  utils/          # general utilities
```

- [x] **Make `src/components/` shared-only**
  - **Keep here:**
    - `src/components/ui/*`
    - `src/components/common/*` if genuinely reusable
    - framework-level shared components only
  - **Move feature-specific folders out over time:**
    - `src/components/dashboard/*` -> `src/features/dashboard/components/*` ✅ done
    - `src/components/employees/*` -> `src/features/employees/components/*` ✅ done
    - `src/components/tasks/*` -> `src/features/tasks/components/*` ✅ done
    - `src/components/messages/*` -> `src/features/messages/components/*` ✅ done
    - `src/components/scheduling/*` -> `src/features/scheduling/components/*` ✅ done
    - `src/components/inventory/*` -> `src/features/inventory/components/*` ✅ done
    - `src/components/analytics/*` -> `src/features/analytics/components/*` ✅ done
    - `src/components/learning/*` -> `src/features/learning/components/*` ✅ done
    - `src/components/forms/*` -> `src/features/forms/components/*` ✅ done
    - `src/components/sections/*` -> `src/features/sections/components/*` ✅ done
    - `src/components/ai/*` -> `src/features/ai/components/*` ✅ done
    - `src/components/events/*` -> `src/features/calendar/components/*` ✅ done
    - `src/components/cookbook/*` -> `src/features/inventory/components/cookbook/*` ✅ done
    - `src/components/announcements/*` -> `src/features/messages/components/announcements/*` ✅ done
    - `src/components/users/*` and `src/components/people/*` -> `src/features/employees/components/users/*` ✅ done
    - `src/components/operations/*` -> `src/features/operations/components/*` ✅ done
    - `src/components/admin/*` -> `src/features/admin/components/*` ✅ done
    - `src/components/availability/*` -> `src/features/availability/components/*` ✅ done
    - `src/components/positions/*` -> `src/features/positions/components/*` ✅ done
    - `src/components/roles/*` -> `src/features/roles/components/*` ✅ done
    - `src/components/reports/*` -> `src/features/analytics/components/reports/builder/*` ✅ done
    - `src/components/payments/*` and `src/components/financial/*` -> `src/features/inventory/components/expenses/*` ✅ done
    - `src/components/reminders/*` -> `src/features/tasks/components/reminders/*` ✅ done
    - `src/components/auth/*` -> `src/features/auth/components/*` ✅ done
    - `src/components/landing/*` -> `src/features/marketing/components/*` ✅ done
    - `src/components/illustrations/*` -> `src/features/marketing/components/illustrations/*` ✅ done
    - `src/components/onboarding/*` -> `src/features/onboarding/components/*` ✅ done
    - `src/components/profile/*` -> `src/features/profile/components/*` ✅ done
    - `src/components/resources/*` -> `src/features/resources/components/*` ✅ done
    - `src/components/templates/*` -> `src/features/templates/components/*` ✅ done
    - top-level `src/components/*.tsx` app/domain files -> `src/app-shell/*` or owning feature folders ✅ done
  - **Why it matters:** `src/components/` is currently acting like a second `features/` folder.

- [x] **Use `src/app-shell/` for app frame code**
  - **Move here if still under `src/components/`:**
    - layout shell components
    - sidebar components
    - navigation components
    - app frame/header components
  - **Target examples:**
    - `src/components/layout/*` -> `src/app-shell/layout/*`
    - `src/components/navigation/*` -> `src/app-shell/navigation/*`
    - `src/components/sidebar/*` -> `src/app-shell/navigation/sidebar/*`
  - **Why it matters:** App shell code is not a business feature and should not be mixed with domain components.

- [x] **Remove the legacy `src/screens/` layer**
  - **Completed:** all active route screens now live in feature-owned page folders or shared/module-owned folders.
  - **Completed:** matching `app/**/page.tsx` imports now point directly to canonical feature pages.
  - **Completed:** duplicate legacy screen directories were removed after comparing them against feature-owned copies.
  - **Completed:** old screen tests were moved next to the related feature pages.
  - **Completed:** the old Pages API handler under `src/screens/api/` was converted to an App Router route.
  - **Completed:** the old router-based Not Found screen was replaced with a static App Router `app/not-found.tsx` page.
  - **Why it matters:** the App Router now imports feature pages directly instead of going through a stale compatibility layer.

- [x] **Remove old React Router dependency**
  - **Completed:** all remaining `react-router-dom` imports were replaced with `src/lib/router-adapter.tsx`.
  - **Completed:** `react-router-dom` was removed from `package.json` and `package-lock.json`.
  - **Why it matters:** the project is now structurally aligned with Next.js routing instead of carrying a second router runtime.

- [x] **Merge duplicate or confusing feature areas**
  - **Recognition:**
    - kept `src/features/recognition/`
    - merged `src/features/recognitions/*` into `src/features/recognition/*`
  - **Availability:**
    - moved `src/availability/*` utilities and tests into `src/features/availability/utils/*`
  - **Modules:**
    - moved `src/modules/operations/*` into `src/features/operations/*`
    - moved `src/modules/system/*` into `src/features/system/*`
    - removed `src/modules/`
  - **Gamification / Leaderboard:**
    - moved `src/features/leaderboard/*` into `src/features/gamification/leaderboard/*`
    - removed `src/features/leaderboard/`
  - **UI primitives:**
    - moved the sidebar implementation from `src/features/ui/components/sidebar.tsx` to `src/components/ui/sidebar.tsx`
    - removed `src/features/ui/`
  - **Why it matters:** Duplicate module names make imports and ownership harder to reason about.

- [x] **Verify the restructured app builds**
  - **Completed:** fixed a messages import collision caused by a helper file named `conversations.ts` shadowing the `conversations/` component folder.
  - **Completed:** wrapped the protected app shell in Suspense so router-adapter search param usage satisfies Next.js prerendering.
  - **Verification:** `npm run lint` passes and `npm run build` passes.
  - **Known issue:** standalone `npm run typecheck` remains too slow/broad to use as a quick Phase 2 gate.
  - **Why it matters:** Phase 2 is not just file movement; the app now compiles after the structural changes.

---

## Phase 3: Component & Code Quality

Goal: reduce complexity in the riskiest active files first, starting with Company Updates.

- [x] **Refactor `CompanyUpdates.tsx` after consolidation**
  - **Current main page:** `src/features/company-updates/pages/CompanyUpdates.tsx`
  - **Completed split into:**
    - `src/features/company-updates/components/CompanyUpdatesFeedSection.tsx`
    - `src/features/company-updates/components/CompanyUpdatesGridSection.tsx`
    - `src/features/company-updates/components/CompanyUpdatesListSection.tsx`
    - `src/features/company-updates/components/CompanyUpdatesPagination.tsx`
    - `src/features/company-updates/components/CompanyUpdatesSkeletons.tsx`
    - `src/features/company-updates/components/CompanyUpdatesSetupState.tsx`
  - **Kept in the page file:**
    - top-level hooks
    - derived page state
    - event handlers
    - high-level layout only
  - **Why it matters:** This page already had hook-order issues. Smaller sections reduce future breakage.

- [x] **Add shared missing-backend handling**
  - **Created:** `src/shared/utils/supabaseErrors.ts`
  - **Added helpers:**
    - `isMissingTableError(error)`
    - `isMissingRpcError(error)`
    - `isMissingRelationshipError(error)`
    - `getSupabaseSetupMessage(error, moduleName)`
  - **Used first in:**
    - `src/features/company-updates`
  - **Now also applied to:**
    - `src/features/calendar`
    - `src/features/scheduling`
  - **Still apply later to:**
    - `src/features/tasks`
    - `src/features/employees`
  - **Why it matters:** Missing Supabase tables/RPCs are known current failures. Handle them consistently instead of crashing or logging noisy errors.

- [x] **Create standard feature state components**
  - **Created:**
    - `src/shared/components/FeatureLoadingState.tsx`
    - `src/shared/components/FeatureErrorState.tsx`
    - `src/shared/components/FeatureSetupRequiredState.tsx`
    - `src/shared/components/FeatureEmptyState.tsx`
  - **Used first in:** `src/features/company-updates/components/CompanyUpdatesSetupState.tsx`
  - **Still apply later to:** calendar, scheduling, tasks, employees, and other incomplete backend modules.
  - **Why it matters:** Every module should look stable even when the backend table for that module is not ready.

- [x] **Replace React Router imports**
  - **Completed:** no `react-router-dom` imports remain in `app/` or `src/`.
  - **Completed:** feature code now uses `src/lib/router-adapter.tsx`.
  - **Why it matters:** removes one of the biggest sources of hybrid App Router confusion.

- [x] **Run checks after each cleanup batch**
  - **Batch policy:** run focused ESLint on touched files and `npm run build` after every cleanup batch.
  - **Backend/schema policy:** run `npm run check:supabase` when schema-facing code changes.
  - **Visible route policy:** run `npm run test:smoke` when route/page behavior changes.
  - **Typecheck policy:** do not use `npm run typecheck` as a per-batch gate right now because it is too slow/broad for this cleanup phase. Keep it as a milestone or overnight check and record blockers in `docs/cleanup-progress.md`.
  - **Why it matters:** Large structural moves create import errors. Catch them immediately.

---

## Phase 4: Final Polish

Goal: finish the architecture cleanup once the highest-risk feature consolidation is stable.

- [x] **Finish migrating `src/screens/` route by route**
  - **Completed:** `src/screens/` has been removed.
  - **Completed:** no `@/screens` imports remain.
  - **Why it matters:** this part of Phase 4 was pulled forward into Phase 2 because it was blocking clean ownership.

- [x] **Clean up root-level shared folders**
  - **Review:**
    - `src/hooks/`
    - `src/repositories/`
    - `src/services/`
  - **Move feature-specific files into the owning feature only when touched.**
  - **Completed:**
    - `src/repositories/companyUpdatesRepository.ts` -> `src/features/company-updates/repositories/companyUpdatesRepository.ts`
    - `src/repositories/messagesRepository.ts` -> `src/features/messages/api/messagesRepository.ts`
    - removed root `src/hooks/messages/*` re-export wrappers after updating imports to `src/features/messages/hooks/*`
    - `src/hooks/useCookbook.tsx` -> `src/features/inventory/hooks/useCookbook.tsx`
    - `src/services/cookbook.ts` -> `src/features/inventory/services/cookbook.ts`
    - `src/services/financialDemoData.ts` -> `src/features/inventory/services/financialDemoData.ts`
    - `src/hooks/useForms.tsx` -> `src/features/forms/hooks/useForms.tsx`
    - `src/repositories/formsRepository.ts` -> `src/features/forms/repositories/formsRepository.ts`
    - removed root `src/services/forms/formImportService.ts` wrapper after updating imports to `src/features/forms/services/formImportService`
    - `src/hooks/scheduling/*` -> `src/features/scheduling/hooks/*`
    - `src/repositories/schedulingRepository.ts` -> `src/features/scheduling/repositories/schedulingRepository.ts`
    - `src/repositories/shiftSwapsRepository.ts` -> `src/features/scheduling/repositories/shiftSwapsRepository.ts`
    - `src/repositories/copilotRepository.ts` -> `src/features/scheduling/repositories/copilotRepository.ts`
    - removed deprecated wrapper `src/hooks/useSchedulingConsolidated.ts`
    - `src/repositories/employeesRepository.ts` -> `src/features/employees/repositories/employeesRepository.ts`
    - kept `src/hooks/useEmployees.ts` as the cross-feature compatibility export
    - kept `src/services/performance/*`, `src/hooks/usePerformanceOverview.tsx`, `src/hooks/usePerformanceDataset.ts`, and `src/repositories/performanceRepository.ts` shared because Analytics and Performance both consume them
    - kept `src/hooks/useTasks.tsx` and `src/hooks/useReminders.tsx` as compatibility entrypoints until a dedicated Tasks cleanup batch
    - converted `src/services/learning/learningService.ts` to a thin compatibility export and kept the implementation in `src/features/learning/services/learningService.ts`
    - moved the Learning service test to `src/features/learning/services/__tests__/learningService.test.ts`
    - removed unused root scheduling/guardrail service wrappers after confirming active imports use `src/features/scheduling/services/*`
  - **Remaining deferred item:** task repositories still need a dedicated Tasks cleanup batch because AI, Analytics, Goals, and tests depend on the current root hook/repository paths.
  - **Why it matters:** Avoid a giant risky move. Clean ownership as part of active feature work.

- [x] **Remove unused dependencies only after imports are gone**
  - **Completed:** removed `react-router-dom`.
  - **Completed:** removed unused Capacitor packages:
    - `@capacitor/android`
    - `@capacitor/cli`
    - `@capacitor/core`
    - `@capacitor/ios`
  - **Completed:** verified there are no active imports for React Router or Capacitor.
  - **Why it matters:** Dependency cleanup should happen after code cleanup, not before.

- [x] **Add smoke tests for visible modules**
  - **Created:** `scripts/smoke-visible-modules.mjs`
  - **Added script:** `npm run test:smoke`
  - **Tested routes:**
    - `/`
    - `/company-registration`
    - `/app/dashboard`
    - `/app/employees`
    - `/app/tasks`
    - `/app/messages`
    - `/app/company-updates`
    - `/app/calendar`
    - `/app/enhanced-scheduling`
    - `/app/inventory-actions`
    - `/app/analytics`
  - **Note:** `/app/enhanced-scheduling` is the current scheduling page; `/app/scheduling` is not an active route.
  - **Why it matters:** Since all features stay in scope, every visible module should at least load without crashing.

- [x] **Add a Supabase contract check**
  - **Created:** `scripts/check-supabase-contract.mjs`
  - **Added script:** `npm run check:supabase`
  - **Checks:** required tables/views used by visible modules and read-style RPCs.
  - **Safety:** mutating RPCs are listed for manual review instead of being executed.
  - **Why it matters:** This catches missing-table problems before demos.

- [x] **Delete legacy folders only when empty**
  - **Confirmed absent:**
    - `src/screens/`
    - `src/components/company-updates/`
    - `src/components/updates/`
    - `src/features/recognitions/`
    - `src/availability/`
    - `src/modules/`
  - **Why it matters:** This confirms the cleanup succeeded instead of hiding broken imports.

## Highest-Impact Execution Order

1. Remove Vite/Vitest and old React leftovers.
2. Consolidate `components/company-updates` and `components/updates` into `features/company-updates`.
3. Refactor `features/company-updates/pages/CompanyUpdates.tsx`.
4. Add shared missing-schema handling and setup states.
5. Move the next domain component folder only after Company Updates is stable.
6. Migrate `src/screens/` gradually, route by route.
