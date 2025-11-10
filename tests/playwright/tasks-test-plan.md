# Tasks Page Playwright Test Plan

## Load & Empty State
1. Navigate to `/tasks` and wait for `[data-testid="tasks-page"]`.
2. Assert loading skeleton disappears and either the list (`[data-testid="tasks-list"]`) or empty state (`[data-testid="tasks-empty-state"]`) is visible.
3. Force an API failure (stub or network intercept) and verify the error alert (`[data-testid="tasks-error"]`) plus retry button.

## Create Task
1. Click `[data-testid="tasks-create-button"]` and ensure the create dialog opens.
2. Fill required fields (`#title`, `#tasks-search-input` optional) and submit.
3. Confirm new card with `data-testid="task-card-<id>"` appears and success toast/message renders.

## Edit Task
1. Click an existing task card to open `TaskDetailsDialog` (`role="dialog"`).
2. Change assignee/goal via selects, save, and assert the badge updates in the card list.
3. Update status (e.g., move to “In Progress”) and check the badge color/label in both dialog and list.

## Delete Task
1. From the details dialog or list, trigger delete (if exposed) or use a contextual action button.
2. Confirm the confirmation modal, accept, and ensure the card disappears plus a toast confirms deletion.

## Filters & Search
1. Type a query into `[data-testid="tasks-search-input"]` and ensure the list filters accordingly.
2. Change priority via `[data-testid="tasks-priority-filter"]` and verify counts/badges adjust.
3. Use the “Clear filters” button and confirm the list resets.

These scenarios should be automated once backend fixtures or intercepts are available to create/edit/delete deterministic tasks.
