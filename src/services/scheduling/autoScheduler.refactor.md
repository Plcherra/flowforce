# autoScheduler.ts Refactor Checklist

- **Target Path**: `src/services/scheduling/autoScheduler.ts`
- **Current LOC**: 653
- **Refactor Goal**: Separate heuristics from IO and document algorithm hooks.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Separate heuristics from IO and document algorithm hooks.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
