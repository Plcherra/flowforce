# FieldEditor.tsx Refactor Checklist

- **Target Path**: `src/components/forms/builder/FieldEditor.tsx`
- **Current LOC**: 684
- **Refactor Goal**: Break out per-field editors + state machines for clarity.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Break out per-field editors + state machines for clarity.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
