# InventoryItemForm.tsx Refactor Checklist

- **Target Path**: `src/components/inventory/InventoryItemForm.tsx`
- **Current LOC**: 2
- **Refactor Goal**: Extract shared field groups & API hooks for reuse in routes/Actions.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Extract shared field groups & API hooks for reuse in routes/Actions.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
