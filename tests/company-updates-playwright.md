# Company Updates – Playwright Scenario Ideas

1. **Load & Pagination**
   - Seed at least two pages of published updates.
   - Visit `/company-updates`, assert the feed skeleton appears and resolves to cards.
   - Switch between Feed/Grid/List and verify the number of rendered cards matches the pagination info.
   - Change page size (e.g., 20) and confirm the server call happens and pagination text updates.

2. **Create Flow**
   - Click “New Update” to open the wizard, complete minimal required fields, and publish.
   - Assert the success toast is shown and the new update appears at the top of the feed with “just now”.

3. **Edit & Archive**
   - From an existing update card, open the overflow menu, choose Archive, and confirm the toast.
   - Verify the archived item disappears from the feed but appears when a future “Archived” tab is selected (once implemented).

4. **Delete & Comment Errors**
   - Trigger Delete, cancel the confirmation, then accept to ensure the update vanishes.
   - Simulate a failed comment post (e.g., mock 500). Ensure the inline error label renders and the destructive toast appears.

5. **Fallbacks**
   - Force the Supabase feed to throw (mock) and confirm the error alert plus empty state renders.
   - Mock recognitions API failure to ensure the fallback card with “Recognitions unavailable” text appears.
