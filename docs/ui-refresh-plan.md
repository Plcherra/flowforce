# UI Refresh Plan

## Goals
- Make the core Communication area minimalist, square, and animated.
- Fold Help Desk into Messages as an on-demand function rather than a standalone page.
- Define a richer, more detailed Inventory system surface that still feels clean.
- Capture backend impacts required to support the refreshed UI.

## Communication Workspace
1. **Layout**
   - Three-column board (`channels` · `conversation` · `ops panel`) inside a centered max-width container with muted background.
   - Square, card-like surfaces using Tailwind `rounded-xl border bg-card` tokens.
   - Smooth transitions (Framer Motion) when switching columns, filters, or opening utilities.
2. **Channels Column**
   - Replace the free-resize layout with a fixed-width "Channel Grid" card.
   - Filters become pill buttons with icons (`All`, `Unread`, `Teams`, `Help Desk`).
   - Each channel block shows last activity glyphs, unread badge, and availability toggle.
3. **Conversation Column**
   - Frame `MessagesMainArea` inside a neutral card with condensed header, limited accent colors, and square composer.
   - Provide inline status chips for video calls and scheduled posts.
   - Keep current message actions but simplify color usage to monochrome + primary accent.
4. **Ops Panel (Right Column)**
   - Animated stack containing:
     - `HelpDeskPanel`: ticket list + quick create, slides in via Framer Motion.
     - `InventorySignalPanel`: pulls highlights from inventory (counts due, shortages) once backend wires exist.
     - `WorkflowShortcuts`: quick links to scheduling/approvals.
   - Panel collapses on mobile beneath conversation view using accordions.

## Help Desk Integration
- Add `helpDeskOpen` state to `useMessagesViewModel`.
- Provide `HelpDeskLauncher` button inside `MessagesHeader` + quick command (`⌘K` soon) to open.
- `HelpDeskPanel` uses existing `useTickets` hook and `useCommunicationBootstrap` context, but renders inline instead of separate route.
- The legacy `/app/help-desk` route will forward users to `/app/messages/helpdesk` while showing a minimal notice.

## Inventory Detail System
1. **InventoryLayout Update**
   - Wrap every inventory route inside a new `InventoryCommandLayout` that provides:
     - Square card header with location selector + date context.
     - Left "Structure" rail (nav + tags) and right "Detail Canvas" containing the route content.
   - Use subtle animation when changing sections.
2. **Detail Canvas Building Blocks**
   - `InventoryGrid` component renders matrix-style cards (Item Type × Location) with drill-downs.
   - `ActivityTimeline` and `ActionBar` components summarize recent movements and next steps.
3. **Data View Enhancements**
   - Immediate support uses placeholder demo data; hooks already return typed responses.
   - Plan to request aggregated endpoints for stock thresholds, PAR trends, waste grouping.

## Backend Impact Checklist
- **Help Desk inside Messages**
  - Need `/tickets` endpoints to support filtering by channel/team context for inline view.
  - Add mutation for "convert message → ticket" when launching from a conversation.
  - Ensure WebSocket push of ticket status to keep panel live.
- **Inventory Signals**
  - Aggregate counts per location + shortage alerts (new `inventory_signals` view or RPC).
  - Lightweight endpoint for "next actions" to feed the action bar.
  - Optionally expose activity stream for timeline (batched, paginated).
- **Channel Metadata**
  - Provide `channel.summary` payload (unread count, last activity, support SLA) so cards can stay minimal without extra queries.
- **Feature Flags**
  - Add `ui_refresh.communication` & `ui_refresh.inventory` toggles in config so backend can scope experiments.

## Next Steps
1. Implement refreshed `MessagesShell` layout + embedded Help Desk panel.
2. Update `InventoryLayout` and supporting components to the new square aesthetic.
3. Ship backend contract doc with the above checklist for API owners.

## Part 6 — Event → Insight → Script Pipeline
The automation stack flows from scheduled KPI computations → persisted KPI snapshots → issue detection → script suggestions. Each step must scope queries by `organizationId` and rely on Supabase RPCs/views so UI surfaces stay in sync.

### Cron Job (`runKpiDetectors.ts`)
- Nightly (plus on-demand) cron calls `computeTasksCompliance`, `computeInventoryHealth`, and `computeLaborVsSales`.
- Each detector writes a normalized record into `ops_kpi_snapshots` with `{ organization_id, detector_key, captured_at, kpi_payload }`.
- Snapshots keep both the raw aggregates and rendered helper text so frontend cards can show the exact values that triggered the detector without recomputation.

### Issue Detectors (`detectIssues.ts`)
- Reads the latest `ops_kpi_snapshots` per detector and compares results against configurable thresholds stored in `ops_kpi_thresholds`.
- When breaches occur, inserts or updates `ops_issues` with `{ status: 'open', severity, detector_key, snapshot_id, metadata }` so downstream tooling can subscribe to the issue feed.
- Maintains audit history by appending to `ops_issue_events` whenever a detector escalates or resolves an issue automatically.

### Automation Suggestion API (`POST /api/ops/issues/[issueId]/suggest-automation.ts`)
1. Load the issue (with its `organization_id`) plus the corresponding KPI snapshot to avoid stale context.
2. Build the LLM prompt that includes detector metadata, current org tone, and JSON schema for the automation script.
3. Call OpenAI with deterministic settings (gpt-4o-mini) while logging latency and token counts for observability.
4. Validate the returned JSON against `AutomationScript` types (failing the request if parsing or validation fails).
5. Insert a record into `ops_automation_suggestions` with `{ issue_id, organization_id, script_json, prompt_version }`.
6. Respond with a preview payload (`{ script, diff, safety_checks }`) so the UI can render the script card without another round-trip.

## Part 7 — FlowForce Operations Adapter
File: `src/server/automation/adapters/flowforceOperationsAdapter.ts`

The adapter must expose a simple RPC surface so automation scripts can bridge FlowForce operations with Supabase data. All helpers wrap typed Supabase queries and reuse the existing `AutomationScript` context.

- `query(resource)`: Accepts `tasks`, `notifications`, `inventory_signals`, `forms`, or `manager_messages`. Runs a `select` with `organizationId` scoping and any filters from the script payload (date range, status, location). Returns typed arrays so scripts can branch on counts/lists.
- `create_task(payload)`: Inserts into the `tasks` table (or equivalent RPC) with enriched metadata (`source: 'automation'`, `detector_key`, `due_at`). On success, emits a `manager_messages` entry to notify channel leads.
- `notify(channel, message)`: Writes to `notifications` (and optionally `manager_messages` for Slack/FlowForce targets) so the communication workspace sees the alert. Supports templated markdown and links back to `/app/messages`.
- `db_insert(target, values)`: Generic helper for inserting into `forms`, `inventory_signals`, or any vetted automation target. Performs schema checks before insert and logs audit metadata so admins can trace automated writes.
- All adapter calls should optionally forward payloads to the FlowForce webhook endpoint (existing `dispatchAutomationToFlowForce`) so external runbooks stay in sync.

## Part 8 — KPI Detectors
Twelve detectors ship with the MVP. Each detector writes a structured KPI snapshot plus recommended automation hooks.

1. `tasks_compliance` — compares completed vs assigned tasks per shift; flags below-threshold compliance so scripts can auto-reassign owners.
2. `overdue_tasks` — counts tasks past due more than X hours; suggests bulk reminders via `notify`.
3. `repeated_stockouts` — uses inventory movement history to find SKUs with 3+ shortages in a week; proposes creating replenishment tasks and notifying procurement.
4. `par_stability` — monitors PAR level variance; raises an issue when deviations exceed tolerance so scripts can create adjustment forms.
5. `prep_timing` — combines production schedules + clock-ins to check if prep starts late; automation nudges kitchen leads.
6. `waste_index` — aggregates waste logs vs sales; triggers workflows to review recipes and create cost-control tasks.
7. `late_clockins` — scans attendance events for shifts starting >5 minutes late; automation posts to manager messages and schedules follow-ups.
8. `understaffed_shifts` — compares forecasted demand vs scheduled labor; scripts can auto-create open shift tasks and notify staffing channels.
9. `overtime` — watches labor_hours vs budgets; automation drafts approvals or caps future scheduling blocks.
10. `ticket_backlog` — tracks unresolved help desk tickets; automation escalates to ops panel and posts reminders.
11. `sla_breach` — measures SLA timers for support queues; scripts route urgent tickets to manager alerts and call `notify`.
12. `form_compliance` — ensures required checklists/forms were submitted per location; automation opens new forms via `db_insert` when gaps appear.

## Part 9 — Requirements for Generated Files
- Maintain the existing square UI aesthetic (Tailwind tokens + neutral palettes).
- Use `framer-motion` (or `motion` components) for layout transitions whenever stateful panels appear/disappear.
- Every feature must read the active `organizationId` from context/hooks before querying Supabase.
- Adhere to the repo’s TypeScript + ESLint standards (no `any`, prefer `zod` schemas when validating).
- Avoid breaking existing routes: new panels coexist behind feature flags.
- Only surface real Supabase-backed data; no hard-coded mock data in production builds.
- All automation scripts must return valid JSON that passes `AutomationScript` validation (`ops_automation_suggestions.script_json`).
