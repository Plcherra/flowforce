# sidebar.tsx Refactor Checklist

- **Target Path**: `src/components/ui/sidebar.tsx`
- **Current LOC**: 1
- **Refactor Goal**: Componentize sections + animation helpers to simplify permissions logic.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Componentize sections + animation helpers to simplify permissions logic.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
