# Recognition Page Playwright Scenarios

1. **Load & filter**
   - Navigate to `/recognition` and wait for the stats skeletons to disappear.
   - Assert KPI cards show numeric values and the leaderboard card badge reports the last sync.
   - Apply timeline, department, and search filters and verify the feed shrinks accordingly.

2. **Manual create flow**
   - Open the "Give Recognition" dialog.
   - Attempt submit with empty fields → verify inline validation messages.
   - Select an employee, choose a source, enter text, submit, and wait for the toast confirming success.

3. **Automation sync & fallback**
   - Click "Run Automation"; ensure button shows spinner/disabled state.
   - Mock a leaderboard API failure to confirm the destructive toast/alert surfaces.

4. **Empty dataset**
   - Stub recognitions API to return empty array.
   - Ensure "No recognitions yet" card appears and filters remain interactive.

5. **Error surfaces**
   - Stub the employees endpoint to fail and verify the page-level "Employee directory unavailable" alert is rendered.
