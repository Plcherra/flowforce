# Manual Testing Guide - Step by Step

**Date:** January 25, 2026  
**Purpose:** Detailed step-by-step guide for manual testing

## Prerequisites

1. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Server should be running on `http://localhost:3000`

2. **Open Browser DevTools:**
   - Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Safari: Enable Developer menu, then `Cmd+Option+C`

3. **Open Console and Network tabs:**
   - Console tab: For JavaScript errors and warnings
   - Network tab: For HTTP request monitoring

## Testing Workflow

### Phase 1: Navigation Testing (15 minutes)

**Goal:** Verify all pages load without crashes

1. **Open the app:** Navigate to `http://localhost:3000`
2. **Login/Authenticate** (if required)
3. **Navigate through ALL sidebar items** one by one:
   - Dashboard
   - Messages
   - Calendar
   - Company Updates
   - Employee Directory
   - Help Desk
   - Operations Intelligence
   - Goals
   - Tasks
   - Forms
   - Scheduling
   - Inventory Actions
   - Inventory Count
   - Items & Setup
   - Purchasing
   - Cookbook
   - Expenses
   - Analytics
   - Reports
   - AI Insights
   - Performance
   - Recognition
   - Leaderboard
   - Certifications
   - Learning Center

**What to check:**
- ✅ Page loads (no white screen)
- ✅ No "Something went wrong" errors
- ✅ Console shows no unhandled errors
- ✅ Network tab shows successful requests (200 status)

**Document any issues:**
- Which page failed
- Error message from console
- Network request that failed

### Phase 2: Create/Submit Actions (20 minutes)

**Goal:** Verify CRUD operations work and persist after refresh

#### Test 1: Messages - Create Channel
1. Navigate to `/app/messages`
2. If empty state shows, click "Create Channel" button
3. Fill in channel creation form:
   - Channel name: "Test Channel"
   - Add members (if applicable)
4. Submit the form
5. **Verify:** Channel appears in sidebar/list
6. **Refresh page (F5)**
7. **Verify:** Channel still appears after refresh

**What to check:**
- ✅ Form submits without errors
- ✅ Channel appears immediately
- ✅ Channel persists after refresh
- ✅ No console errors

#### Test 2: Reports - Upload File
1. Navigate to `/app/reports`
2. Click upload button (or drag & drop area)
3. Select a test PDF file (create a dummy PDF if needed)
4. Wait for upload to complete
5. **Verify:** File appears in "Recent uploads" list
6. **Refresh page (F5)**
7. **Verify:** File still appears after refresh

**What to check:**
- ✅ Upload starts and completes
- ✅ File appears in list
- ✅ File persists after refresh
- ✅ No console errors
- ✅ No network errors (check Network tab)

#### Test 3: Tasks - Create Task
1. Navigate to `/app/tasks`
2. Click "Create Task" button
3. Fill in task form:
   - Title: "Test Task"
   - Description: "This is a test task"
   - Due date: (select a future date)
4. Submit the form
5. **Verify:** Task appears in task list
6. **Refresh page (F5)**
7. **Verify:** Task still appears after refresh

**What to check:**
- ✅ Form submits successfully
- ✅ Task appears in list
- ✅ Task persists after refresh
- ✅ Can update task status
- ✅ No console errors

#### Test 4: Goals - Create Goal
1. Navigate to `/app/goals`
2. Click "Create Goal" button
3. Fill in goal form:
   - Title: "Test Goal"
   - Description: "This is a test goal"
4. Submit the form
5. **Verify:** Goal appears in goals list
6. **Refresh page (F5)**
7. **Verify:** Goal still appears after refresh

**What to check:**
- ✅ Form submits successfully
- ✅ Goal appears in list
- ✅ Goal persists after refresh
- ✅ No console errors

#### Test 5: Forms - Create Form
1. Navigate to `/app/forms`
2. Click "Create Form" button
3. Use form builder to add fields:
   - Add a text field
   - Add a number field
4. Save the form
5. **Verify:** Form appears in forms list
6. **Refresh page (F5)**
7. **Verify:** Form still appears after refresh

**What to check:**
- ✅ Form builder works
- ✅ Form saves successfully
- ✅ Form appears in list
- ✅ Form persists after refresh
- ✅ No console errors

### Phase 3: Error Scenario Testing (15 minutes)

**Goal:** Verify error handling is user-friendly

#### Test 1: Network Disconnection
1. Open DevTools → Network tab
2. Enable "Offline" mode (Chrome: Network throttling → Offline)
3. Navigate to a page that requires data
4. Try to create a new item (task, goal, etc.)
5. **Verify:** 
   - Error message is user-friendly (not generic "Something went wrong")
   - Retry button is available (if applicable)
   - App doesn't crash

**Expected behavior:**
- Shows network error message
- Offers retry option
- Doesn't show generic error

#### Test 2: Invalid Form Submission
1. Navigate to Tasks or Goals
2. Click "Create" button
3. Try to submit form with:
   - Empty required fields
   - Invalid data (e.g., negative numbers where not allowed)
4. **Verify:**
   - Validation errors display clearly
   - Form doesn't submit invalid data
   - Error messages are helpful

**Expected behavior:**
- Shows field-specific validation errors
- Prevents submission
- Error messages are clear

#### Test 3: 401 Unauthorized (if possible)
1. If you can trigger a 401 (e.g., session expires):
   - Wait for session to expire, OR
   - Manually clear auth token
2. Try to perform an action
3. **Verify:**
   - App redirects to login OR
   - Shows "Session expired" message
   - Error message is user-friendly

**Expected behavior:**
- Redirects to login or shows session expired
- Doesn't show generic error
- User can re-authenticate

#### Test 4: Slow Network / Timeout
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G" or "Fast 3G"
3. Navigate to a page that loads data
4. **Verify:**
   - Loading spinner appears
   - App doesn't show spinner forever
   - Either loads successfully or shows timeout error
   - Retry option available (if applicable)

**Expected behavior:**
- Shows loading state
- Times out gracefully or retries
- Doesn't hang indefinitely

### Phase 4: Console & Network Analysis (10 minutes)

**Goal:** Find hidden errors and issues

#### Console Tab Analysis

1. **Clear console** (right-click → Clear console)
2. **Navigate through 5-10 pages**
3. **Check for:**

**Unhandled Promise Rejections:**
- Look for: `Uncaught (in promise)` errors
- **Action:** Document any found

**React Errors:**
- Look for: React component errors
- **Action:** Document any found

**Missing Keys Warnings:**
- Look for: `Warning: Each child in a list should have a unique "key" prop`
- **Action:** Document any found (low priority but should be fixed)

**Hydration Mismatches:**
- Look for: `Warning: Text content did not match`
- **Action:** Document any found

**Other Warnings:**
- Look for: Any other warnings
- **Action:** Document any found

#### Network Tab Analysis

1. **Clear network log** (right-click → Clear)
2. **Navigate through pages and perform actions**
3. **Filter for failed requests:**
   - Click "Failed" filter
   - **Check for:**
     - 401 Unauthorized
     - 500 Internal Server Error
     - CORS errors
     - Network errors

4. **Check for silent failures:**
   - Look for requests that return 200 but have error in response body
   - Look for requests that hang indefinitely

5. **Document any issues found**

### Phase 5: Critical User Flows (10 minutes)

**Goal:** Test end-to-end user journeys

#### Flow 1: Dashboard → Create Task → View Task
1. Navigate to Dashboard
2. Navigate to Tasks
3. Create a task
4. Verify task appears
5. Click on task to view details
6. Update task status
7. **Verify:** All steps work without errors

#### Flow 2: Messages → Create Channel → Send Message
1. Navigate to Messages
2. Create a channel
3. Select the channel
4. Type a test message
5. Send the message
6. **Verify:** Message appears in chat
7. **Refresh page**
8. **Verify:** Message persists

#### Flow 3: Reports → Upload PDF → View Details
1. Navigate to Reports
2. Upload a PDF file
3. Wait for upload
4. Click on uploaded file
5. View file details
6. **Verify:** All steps work without errors

## Documentation Template

For each issue found, document:

```markdown
### Issue #X: [Brief Description]

**Page/Component:** [Which page or component]
**Action:** [What action triggered it]
**Error Message:** [Exact error from console]
**Network Request:** [If applicable, the failed request]
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshot/Log:**
[If applicable]
```

## Quick Test Checklist

Use this for rapid testing:

- [ ] All sidebar pages load
- [ ] Create channel works
- [ ] Upload report works
- [ ] Create task works
- [ ] Create goal works
- [ ] Create form works
- [ ] Items persist after refresh
- [ ] Network errors handled gracefully
- [ ] Invalid forms show validation errors
- [ ] No unhandled promise rejections in console
- [ ] No failed network requests (401, 500, CORS)
- [ ] Dashboard loads with data or empty state
- [ ] Messages can send and receive
- [ ] Reports can upload and view

## Time Estimate

- **Full Testing:** 60-90 minutes
- **Quick Smoke Test:** 15-20 minutes
- **Critical Flows Only:** 30 minutes

## Next Steps After Testing

1. Document all issues found
2. Prioritize issues (Critical → High → Medium → Low)
3. Create follow-up tasks for fixes
4. Re-test after fixes are applied
