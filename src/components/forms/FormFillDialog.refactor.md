# FormFillDialog.tsx Refactor Checklist

- **Target Path**: `src/components/forms/FormFillDialog.tsx`
- **Current LOC**: 2
- **Refactor Goal**: Split viewer vs editor panes; enforce typed form schema hooks.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Split viewer vs editor panes; enforce typed form schema hooks.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
