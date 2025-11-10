## Learning Center Test Plan

### Recommended Unit Tests
1. **`useLearningCenter` hook**
   - Verifies catalog/enrollment queries use the correct React Query keys and are disabled when `companyId` or `profileId` is missing.
   - Confirms `loadMoreProgress` merges cursors and returns empty pages when the Edge Function rejects.
   - Ensures `handleModuleCompletion` invokes `completeEnrollment`, `recordCourseCompletionMetadata`, and invalidates the correct query keys.
2. **`learning- progress-history` Edge Function**
   - Validates that non-admin users cannot view another employee’s enrollment.
   - Checks pagination cursors (`eventCursor`, `snapshotCursor`) advance correctly when more than one page of data exists.
   - Confirms request validation rejects invalid payloads (negative limits, empty enrollment ids).

### Playwright Scenario Ideas
1. **Load**
   - Login as a learner and visit `/learning-center`.
   - Assert overview stats render, skeletons disappear after network idle, and the “View my progress” button navigates back to the overview tab.
2. **Create**
   - Login as a training admin, open the “New course” wizard, fill required fields, submit, and verify the new course appears in the catalog grid without a full reload.
3. **Edit/Progress**
   - Enroll in a course, mark a module complete via “Mark complete”, and confirm the progress bar increments plus a new activity entry appears.
4. **Delete/Empty**
   - Remove all catalog courses (via API fixture), reload the page, and confirm the “No courses in the catalog” empty state renders with the “Create course” CTA for admins.
5. **Pagination Fallback**
   - Mock the `learning-progress-history` endpoint to fail; ensure the UI surfaces the toast error and still renders existing enrollment cards.
