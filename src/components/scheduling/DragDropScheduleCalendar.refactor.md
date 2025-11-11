# DragDropScheduleCalendar.tsx Refactor Checklist

- **Target Path**: `src/components/scheduling/DragDropScheduleCalendar.tsx`
- **Current LOC**: 1
- **Refactor Goal**: Modularize drag/drop + rendering logic to unlock automated tests.

## Suggested Subcomponents / Hooks
- [ ] Create dedicated modules/components that directly support: Modularize drag/drop + rendering logic to unlock automated tests.
- [ ] Extract shared data fetching/mutation hooks and document expected inputs/outputs.

## Test Coverage Tasks
- [ ] Add regression tests (unit or integration) to lock current behavior before refactor.
- [ ] Backfill Storybook/visual or e2e coverage for the new subcomponents.
