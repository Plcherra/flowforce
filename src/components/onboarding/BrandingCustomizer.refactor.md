# BrandingCustomizer.tsx Refactor Checklist

- **Target Path**: `src/components/onboarding/BrandingCustomizer.tsx`
- **Current LOC**: 643
- **Refactor Goal**: Split upload, preview, and theming logic into reusable hooks.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Split upload, preview, and theming logic into reusable hooks.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
