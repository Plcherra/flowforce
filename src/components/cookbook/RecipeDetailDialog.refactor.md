# RecipeDetailDialog.tsx Refactor Checklist

- **Target Path**: `src/components/cookbook/RecipeDetailDialog.tsx`
- **Current LOC**: 183
- **Refactor Goal**: Decompose dialog (header, metrics, actions) or feature-flag heavy sections.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Decompose dialog (header, metrics, actions) or feature-flag heavy sections.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
