## Learning Center QA Checklist

1. **Auth & Data**
   - Verify Learner login loads `/learning-center` without console errors.
   - Confirm admin accounts see Analytics/Admin tabs and non-admins do not.
   - Ensure progress/event history never shows another employee’s data.
2. **Overview Tab**
   - Sync button disables while loading and re-enables when complete.
   - Skeleton cards appear on first load, then snapshot metrics render with real values.
3. **Catalog Tab**
   - Search and category filter update results instantly; recommended badges render for highlighted courses.
   - Empty state appears when no courses exist (check admin CTA vs non-admin refresh button).
   - Enrolling in a course updates the Overview tab after toast confirmation.
4. **Progress Timeline**
   - “Mark complete” advances module progress and inserts an activity entry.
   - “Load more history” fetches older events without duplicate entries or UI flicker; button hides when cursor is exhausted.
5. **Analytics/Admin Tabs**
   - Lazy-loaded charts and tables appear only for admins, showing skeletons while loading.
   - Totals/metrics match Supabase fixtures (spot-check course counts, hours, XP).
6. **Course Creation Wizard**
   - Wizard opens/closes via “New course,” validates required fields, and shows success toast on completion.
7. **Responsive & Theme**
   - Verify layout on mobile (tabs wrap, cards stack) and desktop (multi-column grids).
   - Switch to dark mode and confirm text/icons remain legible with no hard-coded light values.
8. **Error Handling**
   - Simulate progress-history failure (network offline) to confirm error toast and existing timeline remain visible.
   - Force Supabase rejection (invalid company) to confirm the red error banner displays.
