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
| Inventory – Production Events | Not implemented; production flow missing | Implement Production Events similar to Inventory Counts but focused on production tracking; allow selection of production type (e.g., prep, batch, cooked, baked); items will have multiple measurement options (lb, grams, kg, oz, EA); calculate material use, yield, and output cost; auto-sync produced quantities to Items & Setup inventory; record data in Supabase with production cost summaries and approval logs | High | 10h | ☐ |
| Inventory – Internal Transfers | Missing complete functionality for inter-store transfers | Build transfer process between two store locations with recipient and fulfiller roles, delivery date, and comments; enable notifications and “receive” confirmation buttons; allow adding multiple items with measurement units; show transfer status (requested, sent, received, rejected); store records with audit trail in Supabase; integrate cost tracking per transfer for reports | High | 10h | ☐ |
| Inventory – Items & Setup | Unit configuration partially broken; categories and cost calculations not functional | Fix multi-unit configuration and price logic; allow admin to create categories (Menu Item, Production, Raw Material, etc.); support unit conversions (oz → lb → kg); calculate costs dynamically based on quantities and linked ingredients; integrate with Menu Items, Waste Events, and Inventory Count modules; add recipe breakdown linking ingredients to menu items (e.g., Latte = Espresso + 10oz Whole Milk, auto-debit milk from inventory); support barcode and supplier linkage | Critical | 14h | ☐ |
| Inventory – Purchasing | Empty placeholder; requires full procurement workflow | Implement purchasing system to manage orders, receipts, and suppliers; tabs include Place Orders, Receive Orders, Order History, and Invoices; integrate with Items & Setup for pricing and categories; allow vendor selection and API linkage to external suppliers (MarketMan, US Foods, Baldor, etc.); add PO generation, approval, and receiving status tracking; log purchase costs and update inventory automatically | Critical | 14h | ☐ |
| Inventory – Cookbook | Currently functional visually but unaligned with Items & Setup; redundant internal tabs | Merge cookbook data model with Items & Setup; remove unnecessary sub-tabs (Menu Items, Preparation, Ingredients, Planning) but keep “Favorites”; link each recipe to inventory items for cost tracking and ingredient usage; display live item costs from Items & Setup; add nutrition and yield fields; enable exportable recipe sheets and daily prep summaries; integrate with Waste Events and Production Events for smart inventory deduction | High | 12h | ☐ |

| Accounting – Financial Management | Page currently limited to expense tracking; missing integrations, employee, and business financial systems | Expand module into dual-access Financial Management system:  
**Employee Area:** integrate with Toast API for hour tracking, payments, and performance insights; allow employees to view hours worked, earnings, and AI financial tips.  
**Owner/Manager Area:** display payroll summaries, total labor costs, store expenses (shipping, purchasing, utilities, etc.), and sales/gains overview; integrate Waste Events and Inventory data for cost impact analysis; add dashboard for profit/loss visualization and forecasts; enable permissions for managers to approve expenses or payroll; support integration with external systems (Toast, QuickBooks, or MarketMan) for automated synchronization. | Critical | 16h | ☐ |

| Analytics & Reports – Analytics | Currently functional only as static form analytics; AI Assistant and Reports tabs need restructuring | Consolidate Reports into Analytics as a “Reports Analyzer” tab powered by AI; analyze all submitted forms including internal reports; add metrics such as completion rate, engagement, accuracy, and follow-up actions; enhance AI to generate summaries, predictions, and improvement tips; move AI Assistant from tab to floating chat widget (bottom-right Co-Pilot style) for live insights and support; allow AI Assistant to analyze any form or report, suggest fixes, and trigger Co-Pilot actions; include chart visualizations, comparison filters, and export options | High | 12h | ☐ |
| Analytics & Reports – Reports |  |  |  |  |  |

| Admin & Setup – User Management | Current structure fragmented across multiple pages; lacks unified employee control center | Redesign into a single “Team Management” dashboard similar to Connecteam; merge Invite, Position, and Permissions into a modular interface; allow search, filters, and quick actions (edit role, reset password, deactivate, etc.); display employees by department or role; integrate with AI Co-Pilot for quick insights and recommendations on role gaps or inactive users; include profile cards linking to performance and scheduling | Critical | 10h | ☐ |
| Admin & Setup – Invite Employee | Currently a separate page and redundant with Employee Directory “Add User” | Remove standalone page; implement integrated invite modal directly in Employee Directory with one-click “Add User” button; allow bulk invitations via CSV or link; auto-assign default role and permissions; trigger onboarding checklist automatically after invite | High | 6h | ☐ |
| Admin & Setup – Position Management | Isolated management flow; hard to connect roles to permissions or scheduling | Merge into the new Team Management dashboard; allow quick editing of positions, role-based templates, and scheduling linkage; integrate role hierarchy and default permissions; sync with Sections & Permissions for unified access control; allow Co-Pilot to suggest position optimizations based on team workload | High | 8h | ☐ |
| Admin & Setup – Sections & Permissions | Complex UX and disconnected permission layers | Simplify into visual Role Matrix similar to Connecteam’s grid; manage roles (Owner, Admin, Manager, Supervisor, Staff) with toggle-based access for modules; unify backend logic with Position Management; display live permission previews; enable real-time role propagation across all employees; integrate AI-based suggestions to adjust permissions based on performance or risk | Critical | 10h | ☐ |
| Admin & Setup – System Settings | System Settings tabs currently visual-only; features not functional | Expand System Settings into fully working Admin Configuration Hub:  
**General:** Enable saving of company name, contact info, and logo; connect to Supabase and sync across modules.  
**Security:** Make Two-Factor Authentication functional; add configurable password strength rules and session timeout controls.  
**Localization:** Enable live saving of Timezone, Language, and Currency preferences; auto-update across scheduling and finance areas.  
**Notifications:** Redesign into unified configuration system; allow company-wide defaults but also per-module overrides (Scheduling, Tasks, Payments, Inventory, etc.); consider modular settings in each section for better UX.  
**Integrations:** Build API integration panel allowing owners to connect third-party systems like Toast (for payroll, scheduling, and sales data), MarketMan (inventory sync), and Connecteam (scheduling and HR data); include a field for user-provided API keys or OAuth authentication; auto-detect compatible data models and sync fields dynamically.  
**Appearance:** Make theme editor functional; allow customization of colors, logo placement, sidebar branding, and dashboard layout; store configurations per business in Supabase; add “Preview Mode” before saving.  
**Admin Configurations (New Section):** Add an Admin Config area (beside System Settings) for:  
- Managing business structure (locations, departments, working hours)  
- Default role templates and permissions  
- API usage logs and system monitoring  
- AI Co-Pilot configuration for automation scopes. | Critical | 16h | ☐ |

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