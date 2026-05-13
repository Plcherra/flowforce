# Phase 4 Root Cleanup Checklist

Goal: finish the remaining FlowForce cleanup safely by moving only clearly feature-owned root files out of `src/hooks/`, `src/repositories/`, and `src/services/`.

Do not do a risky mass move. Complete one batch at a time, update imports, then verify.

## Verification Policy

- [x] After each cleanup batch, run focused ESLint on touched files.
- [x] After each cleanup batch, run `npm run build`.
- [x] After backend/schema-related changes, run `npm run check:supabase`.
- [x] After visible route changes, run `npm run test:smoke`.
- [x] Treat `npm run typecheck` as a milestone/overnight check for now because it is too slow for every batch.
- [x] Record any typecheck blocker in `docs/cleanup-progress.md`.

## Batch 1: Company Updates Repository

- [x] Move `src/repositories/companyUpdatesRepository.ts` to `src/features/company-updates/repositories/companyUpdatesRepository.ts`.
- [x] Update imports from `@/repositories/companyUpdatesRepository` to `@/features/company-updates/repositories/companyUpdatesRepository`.
- [x] Update `src/features/company-updates/hooks/useCompanyUpdateMutations.ts`.
- [x] Update `src/features/company-updates/hooks/useCompanyUpdates.tsx`.
- [x] Update `src/features/company-updates/hooks/useCompanyUpdateComments.ts`.
- [x] Run focused ESLint for touched Company Updates files.
- [x] Run `npm run build`.

## Batch 2: Messages Hooks And Repository

- [x] Move `src/repositories/messagesRepository.ts` to `src/features/messages/api/messagesRepository.ts`.
- [x] Remove root wrapper `src/hooks/messages/useChannelMessages.tsx`; feature-owned hook already existed at `src/features/messages/hooks/useChannelMessages.tsx`.
- [x] Remove root wrapper `src/hooks/messages/useMessageChannels.tsx`; feature-owned hook already existed at `src/features/messages/hooks/useMessageChannels.tsx`.
- [x] Remove root wrapper `src/hooks/messages/useMessageOperations.tsx`; feature-owned hook already existed at `src/features/messages/hooks/useMessageOperations.tsx`.
- [x] Update imports from `@/repositories/messagesRepository` to `@/features/messages/api/messagesRepository`.
- [x] Update imports from `@/hooks/messages/useMessageChannels` to `@/features/messages/hooks/useMessageChannels`.
- [x] Update imports from `@/hooks/messages/useChannelMessages` to `@/features/messages/hooks/useChannelMessages`.
- [x] Update imports from `@/hooks/messages/useMessageOperations` to `@/features/messages/hooks/useMessageOperations`.
- [x] Update `src/features/messages/api/channelService.ts`.
- [x] Update `src/features/messages/api/messageService.ts`.
- [x] Update `src/features/messages/hooks/useMessageOperations.tsx`.
- [x] Update `src/features/messages/hooks/useChannelMessages.tsx`.
- [x] Update `src/features/messages/hooks/useMessageChannels.tsx`.
- [x] Update `src/features/messages/components/CreateChannelDialog.tsx`.
- [x] Update `src/features/messages/components/modals/DirectMessageDialog.tsx`.
- [x] Update `src/features/messages/components/modals/ChannelMembers.tsx`.
- [x] Update `src/features/messages/components/wizard/useChannelWizard.ts`.
- [x] Update `src/features/messages/tests/messagesRepository.test.ts`.
- [x] Run focused ESLint for touched Messages files.
- [x] Run `npm run build`.

## Batch 3: Inventory Cookbook And Finance

- [x] Move `src/hooks/useCookbook.tsx` to `src/features/inventory/hooks/useCookbook.tsx`.
- [x] Move `src/services/cookbook.ts` to `src/features/inventory/services/cookbook.ts`.
- [x] Move `src/services/financialDemoData.ts` to `src/features/inventory/services/financialDemoData.ts`.
- [x] Update imports from `@/hooks/useCookbook` to `@/features/inventory/hooks/useCookbook`.
- [x] Update imports from `@/services/cookbook` to `@/features/inventory/services/cookbook`.
- [x] Update imports from `@/services/financialDemoData` to `@/features/inventory/services/financialDemoData`.
- [x] Update `src/features/inventory/pages/Cookbook.tsx`.
- [x] Update `src/features/inventory/components/cookbook/CookbookGrid.tsx`.
- [x] Update `src/features/inventory/components/cookbook/RecipeDetailDialog.tsx`.
- [x] Update `src/features/inventory/components/cookbook/PrepList.tsx`.
- [x] Update `src/features/inventory/components/cookbook/DailyCountDialog.tsx`.
- [x] Update `src/features/inventory/components/expenses/ManagerFinancialOverview.tsx`.
- [x] Run focused ESLint for touched Inventory files.
- [x] Run `npm run build`.

## Batch 4: Forms Hooks, Repository, And Service

- [x] Move `src/hooks/useForms.tsx` to `src/features/forms/hooks/useForms.tsx`.
- [x] Move `src/repositories/formsRepository.ts` to `src/features/forms/repositories/formsRepository.ts`.
- [x] Remove root wrapper `src/services/forms/formImportService.ts`; feature-owned service already existed at `src/features/forms/services/formImportService.ts`.
- [x] Update imports from `@/hooks/useForms` to `@/features/forms/hooks/useForms`.
- [x] Update imports from `@/repositories/formsRepository` to `@/features/forms/repositories/formsRepository`.
- [x] Update imports from `@/services/forms/formImportService` to `@/features/forms/services/formImportService`.
- [x] Update `src/features/forms/pages/Forms.tsx`.
- [x] Update `src/features/forms/hooks/useFormDefinition.ts`.
- [x] Update affected files under `src/features/forms/components/`.
- [x] Update `src/features/analytics/components/FormAnalytics.tsx`.
- [x] Update `src/features/analytics/components/ReportsAnalyzer.tsx`.
- [x] Update related form tests and mocks.
- [x] Run focused ESLint for touched Forms files.
- [x] Run `npm run build`.

## Batch 5: Scheduling Hooks And Repositories

- [x] Move all files from `src/hooks/scheduling/` to `src/features/scheduling/hooks/`.
- [x] Move `src/repositories/schedulingRepository.ts` to `src/features/scheduling/repositories/schedulingRepository.ts`.
- [x] Move `src/repositories/shiftSwapsRepository.ts` to `src/features/scheduling/repositories/shiftSwapsRepository.ts`.
- [x] Move `src/repositories/copilotRepository.ts` to `src/features/scheduling/repositories/copilotRepository.ts`.
- [x] Update imports from `@/hooks/scheduling/` to `@/features/scheduling/hooks/`.
- [x] Update imports from `@/repositories/schedulingRepository` to `@/features/scheduling/repositories/schedulingRepository`.
- [x] Update imports from `@/repositories/shiftSwapsRepository` to `@/features/scheduling/repositories/shiftSwapsRepository`.
- [x] Update imports from `@/repositories/copilotRepository` to `@/features/scheduling/repositories/copilotRepository`.
- [x] Remove deprecated wrapper `src/hooks/useSchedulingConsolidated.ts` after all imports are updated.
- [x] Run focused ESLint for touched Scheduling files.
- [x] Run `npm run build`.

## Files To Keep In Root-Level Shared Areas For Now

- [x] Keep `src/hooks/useAuth.tsx` in root hooks.
- [x] Keep `src/hooks/useProfile.ts` in root hooks.
- [x] Keep `src/hooks/use-toast.ts` in root hooks.
- [x] Keep `src/hooks/use-mobile.tsx` in root hooks.
- [x] Keep `src/hooks/useCan.tsx` in root hooks.
- [x] Keep `src/hooks/useSupabaseQuery.ts` in root hooks.
- [x] Keep `src/hooks/useRealtime.ts` in root hooks.
- [x] Keep `src/hooks/useTenantContext.ts` in root hooks.
- [x] Keep navigation hooks in root hooks for now.
- [x] Keep permission hooks in root hooks for now.
- [x] Keep `src/services/supabase/admin.ts` in root services.

## Deferred Manual Review

- [x] Review Tasks hooks/repositories separately because duplicate root and feature hook structures exist.
  - Decision: keep root compatibility hooks for now (`src/hooks/useTasks.tsx`, `src/hooks/useReminders.tsx`) because AI, Analytics, Goals, and task tests still import them. Move task repositories only in a dedicated Tasks cleanup batch.
- [x] Review Learning service duplication before moving or deleting wrappers.
  - Completed: kept the implementation in `src/features/learning/services/learningService.ts`, converted `src/services/learning/learningService.ts` to a thin compatibility export, and moved the Learning service test into `src/features/learning/services/__tests__/`.
- [x] Review Performance service ownership because it is shared by analytics and performance.
  - Decision: keep `src/services/performance/*`, `src/hooks/usePerformanceOverview.tsx`, `src/hooks/usePerformanceDataset.ts`, and `src/repositories/performanceRepository.ts` in shared/root ownership for now because Analytics and Performance both depend on them.
- [x] Review Employee hook ownership because it is used by admin, scheduling, recognition, inventory, and gamification.
  - Completed: kept `src/hooks/useEmployees.ts` as a root compatibility export for cross-feature consumers, and moved the implementation-only repository to `src/features/employees/repositories/employeesRepository.ts`.
- [x] Review `src/services/scheduling/*`, `src/services/scheduleRulebookService.ts`, and `src/services/guardrail/*` after comparing with existing `src/features/scheduling/services/*`.
  - Completed: removed unused root scheduling/guardrail compatibility wrappers and the duplicate root guardrail test after confirming active imports already point at `src/features/scheduling/services/*`.

## Final Documentation Updates

- [x] Update `docs/cleanup-progress.md` after each completed batch.
- [x] Update `docs/checklists/AUDIT_FULL_PROJECT.md` after each completed batch.
- [x] Mark Phase 3 verification policy complete after it is documented.
- [x] Mark Phase 4 root-folder cleanup complete only for the clear feature-owned files moved in these batches.
