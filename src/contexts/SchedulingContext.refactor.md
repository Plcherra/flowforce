# SchedulingContext.tsx Refactor Checklist

- **Target Path**: `src/contexts/SchedulingContext.tsx`
- **Current LOC**: 801
- **Refactor Goal**: Slice provider into focused stores (shifts, locks, requests).

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Slice provider into focused stores (shifts, locks, requests).
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
