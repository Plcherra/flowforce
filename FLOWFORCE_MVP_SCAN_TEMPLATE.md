# FLOWFORCE MVP SCAN TEMPLATE\
Date: _________  \
Version: _________  \
Reviewer: _________  \

---\

## 1. PAGES & COMPONENTS\

| Page / Component | Issue Description | Required Fix / Feature | Priority (High / Med / Low) | Est. Time | Status |\
|------------------|------------------|------------------------|-----------------------------|------------|--------|\
| Forms Page |  |  |  |  |  |\
| Goals Page |  |  |  |  |  |\
| Calendar |  |  |  |  |  |\
| Schedule |  |  |  |  |  |\
| Employees Area |  |  |  |  |  |\
| Dashboard |  |  |  |  |  |\
| Reports |  |  |  |  |  |\
| Settings / Permissions |  |  |  |  |  |\
| Messages Page | Resize overflow, missing user handling | Add min-width constraint to chat sidebar and placeholder prompt for single user | High | 3h | ☐ |\
| Calendar Page | Event/Meeting duplication, disappearing after creation or refresh | Merge buttons into one, add optimistic UI updates and persistent Supabase fetch | Critical | 6h | ☐ |\

| Company Updates | Creation wizard UI inconsistent; cannot select self as recipient; duplicate close buttons; fake engagement counts | Fix recipient search to include current user; clean modal header; remove mock counts; ensure publish persists post + engagement | High | 5h | ☐ |
| Employee Directory | Drawer too long; permission overrides UX poor | Redesign drawer layout with tabs/accordion; paginate overrides; lazy-load heavy panels | Medium | 4h | ☐ |
| Employee Directory | Audit tab shows error "public.audit_logs does not exist" | Create/migrate `audit_logs` table and guard empty state (hide tab if disabled) | High | 3h | ☐ |
| Messages Page – Help Desk | Section button visible but not functional | Link created sections to a messages channel filter/route and list conversations | High | 2h | ☐ |
| Sections & Access | Template flow creates sections with inert pages; duplicates appear | Wire pages to real routes/components; prevent duplicate seeds; replace “description-only” page with page-builder that selects components | High | 6h | ☐ |

| Operations – Goals | Page fails to load and create goals; no user assignment or grid view | Fix Supabase goals table fetch; add create mutation with user_id; build grid layout; link tasks/owner to goal; add optimistic UI updates | Critical | 8h | ☐ |
| Operations – Tasks | Task drawer has no completion, reopen, or status control | Add task state machine (todo → in progress → done → reopen); add complete/reopen buttons and API update; sync with Supabase; build timeline tracking | High | 6h | ☐ |
| Operations – Forms | Form builder too long and not scroll-friendly; infinite loading; all creation options unresponsive | Implement scrollable modal or dynamic height; fix Supabase fetch for form fields; repair new form creation (template, upload, scratch); add error boundaries | Critical | 8h | ☐ |
| Operations – Scheduling | Page partially loads; debug data visible; AI Insights, Staff Management, Automation, and Availability tabs fail; grid never loads | Separate debug log from production view; optimize Supabase joins; ensure weekly grid renders; fix tab routing and empty state handling | Critical | 10h | ☐ |
| Operations – Availability | Page loads indefinitely; belongs inside Scheduling tabs not sidebar | Merge “My Availability” and “Manage Availability” into Scheduling sub-tabs; fix load loop; adjust sidebar config and routing | High | 4h | ☐ |

| HR & Development – AI Insights |  |  |  |  |  |
| HR & Development – Performance | Page loads empty due to missing data source and no performance logic validation | Add mock test data generation (employees, reviews, goals); run Supabase query scans for joins; test CRUD endpoints for performance metrics; add validation for goal linkage and review status; ensure AI Insights and Goals pages reflect same dataset | High | 6h | ☐ |
| HR & Development – Time Off | Should not exist as standalone HR page; must be integrated into Scheduling as a Time Off Request module | Add Time Off Request as a scheduling submodule under “My Availability”; connect to shift data and availability tables; sync approvals, requests, and balance tracking to supervisor dashboards | High | 4h | ☐ |
| HR & Development – Recognition | Page only shows static demo data; no dynamic link between goals, tasks, or employee training progress | Connect to Supabase recognition table; link with employee Goals, Tasks, and new Training/Onboarding module (to be created for new hires); add automation to generate recognition when employees complete training or achieve goal milestones; display recognitions in Company Updates and Performance dashboard | High | 8h | ☐ |
| HR & Development – Leaderboard | Gamification system required to encourage employee engagement and performance | Implement leaderboard that tracks XP, badges, and achievements from Tasks, Goals, Recognitions, and Training modules; display rankings by department, role, and period (weekly, monthly, all-time); integrate with Co-Pilot to trigger automated challenges and rewards; add badge tiers (Bronze, Silver, Gold, Platinum) based on XP; store XP in Supabase `gamification_leaderboard` table; include analytics view and filters; enable leaderboard insights to sync with Performance and Recognition dashboards | High | 10h | ☐ |
| HR & Development – Certifications | Page currently visual-only with no functional data or link to other systems | Integrate with Recognitions, Leaderboard, Tasks, Goals, and Learning Center; award certifications and badges based on completed tasks, XP points, and finished courses; store certification progress in Supabase; trigger badge achievements through Co-Pilot; display certificate cards with progress bars and dynamic status updates | High | 10h | ☐ |
| HR & Development – Learning Center | Only static demo with no data or admin creation tools | Implement full training module with course creation wizard for admins; add “Browse Catalog” page for employees; link courses to Certifications and XP system; track course progress (hours, completion, level); allow Co-Pilot to recommend next courses based on performance data; store all progress in Supabase; enable analytics dashboard for training insights | High | 12h | ☐ |

| Inventory – Actions |  |  |  |  |  |
| Inventory – Count Execution | Current inventory count module is non-functional; missing process flow for daily or end-of-day counts | Implement full inventory count workflow modeled after mobile design (images 2–4): organized by date and count type (Day Start / Day End); select storage area with associated items; allow adding descriptions and notes; support measurement units (lb, g, kg, EA, box, etc.) and auto-calculation for multi-unit items (e.g., 1 box = 5 bottles of 16oz); add optional barcode scanning for future release; store counts and history in Supabase; enable supervisors to review and approve counts | Critical | 12h | ☐ |
| Inventory – Items & Setup |  |  |  |  |  |
| Inventory – Purchasing |  |  |  |  |  |
| Inventory – Cookbook |  |  |  |  |  |

| Accounting – Expenses |  |  |  |  |  |

| Analytics & Reports – Analytics |  |  |  |  |  |
| Analytics & Reports – Reports |  |  |  |  |  |

| Admin & Setup – User Management |  |  |  |  |  |
| Admin & Setup – Invite Employee |  |  |  |  |  |
| Admin & Setup – Position Management |  |  |  |  |  |
| Admin & Setup – Sections & Permissions |  |  |  |  |  |
| Admin & Setup – System Settings |  |  |  |  |  |

---\

## 2. CORE SYSTEMS\

| System | Observed Problem or Missing Logic | Required Fix / Task | Priority | Est. Time | Status |\
|---------|----------------------------------|---------------------|-----------|------------|--------|\
| Auth Flow (Login, Invite, Roles) |  |  |  |  |  |\
| Database Models (Employees, Shifts, Tasks) |  |  |  |  |  |\
| State Management (Context / Hooks) |  |  |  |  |  |\
| Notifications & Reminders |  |  |  |  |  |\
| Permissions Logic |  |  |  |  |  |\

| Permissions Logic | Duplicate matrices between Sections & Access and User Drawer; unclear precedence | Define RBAC: roles, permissions, role_permissions, user_roles, user_overrides. Compute effective permissions; set company defaults; edit per-user in drawer only | Critical | 8h | ☐ |
| Audit & Analytics | Missing `public.audit_logs` table powering user audit | Create table + write events on key actions; feature-flag tab; hide when disabled | High | 4h | ☐ |
| Engagement Metrics | "Unable to load engagement data" for single-user orgs | Add safe empty states; fetch only when feature enabled; backfill later | Low | 2h | ☐ |
| Directory Search | Cannot find current user in "Select individuals" | Ensure query lists active users including self when admin; add fallback list of all users | High | 2h | ☐ |
| Tasks & Goals Linking | Tasks not linked to user or goal context | Add foreign keys (goal_id, assigned_to) to tasks; update UI forms; ensure cascade delete; sync progress to goal completion | High | 5h | ☐ |

### Performance Module Testing Framework

| Test / Scan | Description | Expected Result | Priority | Status |
|--------------|-------------|-----------------|-----------|--------|
| Database Connection Test | Verify Supabase performance tables and relations (employees, goals, reviews). | All tables connect without null returns. | Critical | ☐ |
| CRUD Simulation | Simulate creating, reading, updating, and deleting performance reviews/goals. | Operations complete without error and reflect across dashboard. | High | ☐ |
| Cross-Link Validation | Confirm performance goals sync with Goals and AI Insights modules. | Data alignment visible in both modules. | High | ☐ |
| Frontend Rendering Test | Load UI with mock data to ensure rendering integrity. | Performance metrics and goals appear as cards/charts. | High | ☐ |
| Error Handling | Intentionally break Supabase fetch and log UI fallback responses. | Clear user message without app crash. | Medium | ☐ |
| Automation Sync Test | Confirm Co-Pilot triggers based on review results (e.g., auto goal or reminder creation). | Co-Pilot executes tasks successfully. | High | ☐ |

### AI Insights System Integration

| Component | Description | Integration Points | Priority | Est. Time | Status |
|------------|-------------|-------------------|-----------|------------|--------|
| Scenario Simulator | Forecasts operational outcomes from variables like staffing, goals, tasks, and inventory. | Linked to Scheduling, Tasks, Goals, and Revenue data; triggers Co-Pilot to create automated actions. | Critical | 10h | ☐ |
| Interactive KPI Tiles | Replace static cards with real-time, clickable insights that open modals or generate improvement tasks/goals. | Syncs with Tasks, Goals, Scheduling, and Performance metrics. | High | 8h | ☐ |
| AI Actions Feed | Replaces OODA Snapshot; displays actionable alerts based on data triggers (overdue tasks, shift imbalance, cost spikes). | Connected to Tasks, Goals, Reminders, and Notifications; supports one-click action creation. | High | 8h | ☐ |
| Quick Actions + Automation | Enables users to fix, assign, or remind directly from an insight card. | Deep integration with Co-Pilot, Task, Reminder, and Goal APIs. | High | 6h | ☐ |
| Business-Level Analytics | Adds meaningful KPIs like Goal Velocity, Labor Efficiency vs Revenue, Forecast Confidence. | Pulls aggregated data from all modules; drives report summaries and predictions. | Medium | 6h | ☐ |
| Closed AI Loop | End-to-end automation cycle where system detects → AI interprets → user approves → Co-Pilot executes → Insights learn. | Co-Pilot core logic linked with AI Insights and all data tables. | Critical | 10h | ☐ |

**Notes:**
- This system merges AI Insights with Co-Pilot automation to maintain a continuous improvement loop.
- All Insights outputs can be converted into actions (Tasks, Goals, Reminders) via the unified automation API.
- The Scenario Simulator remains the core “What-If” engine, feeding data into predictions and suggestions for operational decisions.
---\
\
## 3. INTEGRATIONS\
\
| Integration | Current Status | Missing / To-Do | Priority | Est. Time | Status |\
|--------------|----------------|----------------|-----------|------------|--------|\
| Supabase |  |  |  |  |  |\
| Connecteam |  |  |  |  |  |\
| MarketMan |  |  |  |  |  |\
| AI Assistant (OpenAI / local) |  |  |  |  |  |\
\
---\
\
## 4. LAUNCH REQUIREMENTS\
\
| Area | Item | Description / Notes | Status |\
|------|------|--------------------|--------|\
| Branding | Logo, favicon, splash screen |  |  |\
| Onboarding | Walkthrough / Tutorial |  |  |\
| QA Testing | Core workflow works end-to-end |  |  |\
| Documentation | README, MVP summary |  |  |\
| Deployment | Vercel auto-deploy + env check |  |  |\
\
---\
\
## 5. MVP SUMMARY\
\
### 
\f1 \uc0\u9989 
\f0  **Core Features Ready**\
-  \
\
### 
\f1 \uc0\u55357 \u57313 
\f0  **Secondary**\
-  \
\
### 
\f1 \uc0\u55357 \u56628 
\f0  **Deferred**\
-  \
\
---\
\
### **Estimated Total Time**\
- Critical fixes: ___ hours  \
- Secondary tasks: ___ hours  \
- Target Launch Date: ___ / ___ / 2025  \
\
---\
\
### **Notes**\
-  \
-  \
- 