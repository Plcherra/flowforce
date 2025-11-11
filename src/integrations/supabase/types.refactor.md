# types.ts Refactor Checklist

- **Target Path**: `src/integrations/supabase/types.ts`
- **Current LOC**: 7523
- **Refactor Goal**: Split/generated typings per schema module to reduce bundle churn.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Split/generated typings per schema module to reduce bundle churn.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
