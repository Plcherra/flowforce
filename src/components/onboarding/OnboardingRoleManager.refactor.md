# OnboardingRoleManager.tsx Refactor Checklist

- **Target Path**: `src/components/onboarding/OnboardingRoleManager.tsx`
- **Current LOC**: 516
- **Refactor Goal**: Break down table, dialog, and assignment logic into sub-components.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Break down table, dialog, and assignment logic into sub-components.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
