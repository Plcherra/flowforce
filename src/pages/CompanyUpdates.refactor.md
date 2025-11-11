# CompanyUpdates.tsx Refactor Checklist

- **Target Path**: `src/pages/CompanyUpdates.tsx`
- **Current LOC**: 511
- **Refactor Goal**: Move Supabase calls + analytics cards into feature modules.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Move Supabase calls + analytics cards into feature modules.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
