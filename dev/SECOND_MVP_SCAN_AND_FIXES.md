# SECOND MVP SCAN & FIXES

This file tracks the second global review cycle for Flowforce.  
Each task describes a functional area requiring fixes, improvements, or feature expansions.  
Codex will later parse this file and create multiple implementation tasks from each section.

---

## Task 1 – Help Desk Auto-Routing and Supervisor Assignment

### Objective
Turn the Help Desk from a static message board into a live operational support system that routes issues to the correct on-duty supervisor automatically.

### Current Problem
All messages go to one person (the default admin).  
Supervisors or managers off duty still receive calls or alerts.  
There’s no awareness of the current schedule or department responsibility.

### Improvement Plan

#### 1. Intelligent Routing
- Determine sender’s department (FOH / Kitchen / Production / General).  
- Query the **Scheduling** table to find who is on duty for that department and shift.  
- Auto-assign the ticket to that supervisor.  
- If no supervisor is scheduled, assign to the **Manager on Call** (fallback).  

#### 2. Ticket Management Logic
- Extend `tickets` table with:  
  `department`, `assigned_user_id`, `priority`, `status`, `created_at`.  
- Backend endpoint `/api/helpdesk/assign` handles new messages.  
- On submission, automatically update `assigned_user_id` and send confirmation to the user.

#### 3. Frontend Updates
- Add **Department selector** when creating a Help Desk ticket.  
- Display “Assigned to {Supervisor Name}” in the ticket card.  
- Include filters: *My Tickets*, *Department*, *All*.

#### 4. Notifications
- Subscribe to `tickets` realtime channel.  
- Notify the assigned supervisor via toast and optional email/SMS.  
- Add admin override to reassign tickets manually.

#### 5. AI Co-Pilot (Phase 2)
- Analyze messages to detect category (delay, emergency, supply issue).  
- Auto-set priority (High / Medium / Low).  
- Escalate automatically if no response in X minutes.

---

### Expected Outcome
- Issues are routed instantly to the correct supervisor.  
- Managers off duty aren’t disturbed.  
- All messages have traceable assignments and audit history.  
- Improved response times and accountability.

---

### Estimated Effort
| Component | Hours | Priority |
|------------|--------|-----------|
| Backend Logic | 6 h | Critical |
| Frontend Form & Display | 5 h | High |
| Realtime Notifications | 3 h | High |
| Admin Override UI | 3 h | Medium |
| Testing / QA | 3 h | High |

**Total ≈ 20 hours**

---

### Notes
This is the first task for the second MVP scan.  

---

### Parallel Execution Notes
- This task is **independent** and can be executed in parallel with all other tasks in the MVP scan.  
- No shared files, tables, or global logic are modified that could interfere with other active tasks.  
- Database schema updates are isolated and version-safe.  
- UI changes are scoped only to their respective components.  
- Safe for simultaneous Codex execution.

---

## Task 2 – Messages Page UI Refinement and Help Desk Integration

### Objective
Enhance the Messages page layout and simplify user interaction by improving the divider visuals, fixing Help Desk behavior, and consolidating related components.

### Current Problems
- The vertical divider between the conversation list and chat panel appears visually harsh and misaligned with the rest of the UI.  
- Selecting “Help Desk” does not modify the page state or load any data.  
- Help Desk appears redundantly in the sidebar and should instead be integrated natively within the Messages view.

### Improvement Plan
#### 1. UI Redesign
- Replace the current hard border with a subtle divider (e.g., 1px neutral-200 line or shadow separation).  
- Apply consistent padding and spacing to match Dashboard and Calendar visual style.  
- Adjust the responsive layout to better center conversation content on wide screens.  

#### 2. Functional Integration
- Merge the standalone **Help Desk** section into the **Messages** page.  
- When "Help Desk" is selected, dynamically filter the conversation list to show help-desk-related tickets only.  
- Ensure “All,” “Unread,” “Teams,” and “Help Desk” filters work in tandem without UI refresh.  
- Remove the redundant Help Desk sidebar item after integration.

#### 3. Navigation Logic
- Preserve navigation history so users can return to previous filters.  
- Ensure correct highlighting of selected tabs.  

#### 4. Performance & Consistency
- Test conversation fetching and state management to ensure zero flicker when switching filters.  
- Standardize all empty states (“No conversations yet”) with consistent icons and typography.

---

### Expected Outcome
- Cleaner, more modern visual balance in the Messages panel.  
- Fully functional Help Desk tab embedded in the unified conversation flow.  
- Reduced redundancy in navigation.  
- Improved overall UX consistency across communication tools.

---

### Estimated Effort
| Component | Hours | Priority |
|------------|--------|-----------|
| UI Divider Redesign | 3 h | High |
| Help Desk Filter Integration | 5 h | Critical |
| Navigation & Filter Logic | 3 h | High |
| Testing & QA | 2 h | Medium |

**Total ≈ 13 hours**

---

### Notes
This task focuses on improving both visual design and user logic inside the Messages section, ensuring that the Help Desk becomes part of the same interaction flow without appearing as a separate module.

---

### Parallel Execution Notes
- This task is **independent** and can be executed in parallel with all other tasks in the MVP scan.  
- No shared files, tables, or global logic are modified that could interfere with other active tasks.  
- Database schema updates are isolated and version-safe.  
- UI changes are scoped only to their respective components.  
- Safe for simultaneous Codex execution.

---

## Task 3 – Calendar Fixes and Full Schedule Grid Implementation

### Objective
Repair all broken event creation features (Meetings, Events, Vendor Visits), remove the false “Calendar offline” state, and implement a usable calendar grid for scheduling and overview.

### Current Problems
- Calendar falsely displays “offline” even when connected.  
- Creating Meetings, Events, or Vendor Visits results in `"Unexpected error occurred"`.  
- Schedule grid does not render staff sessions or meeting data.  
- No backend sync validation between events and scheduling.  

### Improvement Plan
#### 1. Connectivity & Load Fix
- Remove static “offline” state logic and replace it with real connection validation using Supabase health check.  
- Display “Offline” only when network or Supabase connection fails.  

#### 2. Event Creation
- Fix API routes for:
  - `/api/calendar/createMeeting`
  - `/api/calendar/createEvent`
  - `/api/calendar/createVendorVisit`
- Validate that form payloads match the Supabase schema:
  - Required fields: `title`, `start`, `end`, `type`, `location`, `created_by`.
- Add error boundaries and improved message handling (“Failed to save event: Invalid schema”).

#### 3. Calendar Grid
- Implement a dynamic **weekly grid** view that displays:
  - Shifts, events, and vendor visits in the same timeline.  
  - Color-coded statuses: `Published`, `Draft`, `Understaffed`.  
- Add navigation (`<`, `>`, Today, Week, Month, Year).  
- Optimize rendering to prevent blank states and ensure scrollable weeks.

#### 4. Data Sync
- Link meetings and vendor visits to corresponding shifts in the `schedules` table.  
- Auto-populate assigned employees in the grid.  
- Add data caching and revalidation (`useSWR` or Supabase’s `realtime`).

#### 5. UI & UX
- Redesign empty states with proper icons and contextual hints.  
- Ensure consistency with the dashboard’s theme and typography.

---

### Expected Outcome
- Fully functional event creation with live Supabase sync.  
- Accurate online/offline status detection.  
- Weekly calendar grid with visible events and shifts.  
- Seamless navigation and improved user experience.

---

### Estimated Effort
| Component | Hours | Priority |
|------------|--------|-----------|
| Connectivity & Error Handling | 4 h | Critical |
| Event Creation APIs | 6 h | Critical |
| Calendar Grid Implementation | 8 h | High |
| UI/UX & QA | 4 h | High |

**Total ≈ 22 hours**

---

### Parallel Execution Notes
- This task is **independent** and safe for parallel execution.  
- No overlapping schema or UI dependencies with Help Desk or Messages tasks.  
- Supabase table edits are versioned to avoid collisions.  
- Only modifies `calendar` and `events` components.

---