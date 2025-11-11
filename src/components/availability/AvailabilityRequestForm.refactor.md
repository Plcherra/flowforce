# AvailabilityRequestForm.tsx Refactor Checklist

- **Target Path**: `src/components/availability/AvailabilityRequestForm.tsx`
- **Current LOC**: 687
- **Refactor Goal**: Separate grid rendering from Supabase IO to share with new tabs.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Separate grid rendering from Supabase IO to share with new tabs.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
