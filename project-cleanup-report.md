# Project Cleanup Report
Generated: Mon Nov 10 05:34:59 UTC 2025

## Area Map (Features vs Ownership)
| Area | Key Paths | Notes | Status |
| --- | --- | --- | --- |
| App shell & navigation | `src/App.tsx`, `src/router/index.tsx` | Central router lazily mounts every surface and wraps `/app` routes with `ProtectedRoute` and `AppShell`, giving a clean secured shell (src/router/index.tsx:1-202). | ✅ Ready |
| People Ops (directory, recognition, profile) | `src/pages/Employees.tsx`, `src/pages/Profile.tsx`, `src/features/employees/*`, `src/components/employees/*` | Employees page lazily loads TeamDirectory and relies on shared loaders/tested hooks (src/pages/Employees.tsx:1-13), while profile/security experiences live inside `src/components/profile`. | ✅ Ready |
| Communications & resources | `src/pages/Messages.tsx`, `src/pages/CompanyUpdates.tsx`, `src/routes/resourceRoutes.tsx` | Messages shell consumes the dedicated feature view model (src/pages/Messages.tsx:1-6) and Resources fan-outs through nested routes for docs/blog/video (src/routes/resourceRoutes.tsx:2-23). | ✅ Ready |
| Operations & inventory | `src/features/inventory/**`, `src/modules/operations/pages/OperationsPage.tsx`, `src/pages/InventoryCountExecution.tsx` | `inventory-actions` now points to the feature route while `OperationsPage` simply re-exports the legacy `OperationsIntelligence` page (src/modules/operations/pages/OperationsPage.tsx:1), highlighting overlap between pages/features/modules. | ⚙️ Partial |
| Scheduling & availability | `src/pages/EnhancedScheduling.tsx`, `src/components/scheduling/**`, legacy `src/pages/availability/*` | Router redirects `/app/availability*` to Enhanced Scheduling (src/router/index.tsx:224-229) but the old “My/Manage Availability” pages remain in-place (src/pages/availability/index.tsx:1-44 & manage.tsx:1-40). | ⚙️ Partial |
| Learning & certifications | `src/pages/LearningCenter.tsx`, `src/components/learning/**`, `supabase/functions/learning-progress-history` | Learning Center stitches together catalog/progress/admin tabs and hooks into Supabase edge functions for history (src/pages/LearningCenter.tsx:1-40; supabase/functions/learning-progress-history/index.ts:1-78). | ✅ Ready |
| AI & Copilot | `src/pages/AIInsights.tsx`, `src/pages/copilot/review.tsx`, `src/hooks/useCopilotOperations.ts` | AI Insights is wired into performance datasets, while Copilot review hooks and Copilot operations hook exist but are not routed/imported anywhere else (src/pages/copilot/review.tsx:1-78; src/hooks/useCopilotOperations.ts:1-45). | ⚙️ Partial |
| System settings & admin | `src/modules/system/pages/SettingsPage.tsx`, `src/modules/system/hooks/*` | Settings page composes seven lazy tabs with shared error boundaries (src/modules/system/pages/SettingsPage.tsx:1-76) and is the canonical admin experience. | ✅ Ready |
| Supabase & server | `supabase/functions/**`, `supabase/migrations/**`, `src/server/**` | Edge functions (e.g., learning progress) are healthy (supabase/functions/learning-progress-history/index.ts:1-78) but config only stores `project_id` (supabase/config.toml:1) and migrations include duplicated IDs (20250625033340-*.sql). Server utilities live under `src/server` (src/server/vendorEvents.ts:1-44). | ⚙️ Partial |
| Docs & QA plans | `/docs`, `/tests` | Several audit docs still contain template placeholders (docs/project-health-report.md:1-20; docs/ui-ux-audit-report.md:1-40) yet QA checklists in `/tests` are current. | ⚙️ Partial |

## Router ↔ Page Coverage
| Route | Component Source | Page folder? | Notes |
| --- | --- | --- | --- |
| `/app/dashboard`, `/app/messages`, `/app/employees`, etc. | `src/pages/**/*.tsx` | ✅ | Standard marketing + app routes pull directly from `src/pages` (e.g., Dashboard/Employees/Messages in src/router/index.tsx:120-190). |
| `/app/inventory-actions` | `src/features/inventory/routes/Actions.tsx` | ⚠️ No standalone page | Router imports the feature route (src/router/index.tsx:35-36,200-202) even though `src/pages/InventoryActions.tsx` still exists. |
| `/app/operations` | `src/modules/operations/pages/OperationsPage.tsx` | ⚠️ Wrapper | Module page re-exports `src/pages/OperationsIntelligence.tsx` (src/modules/operations/pages/OperationsPage.tsx:1), so both layers must stay in sync. |
| `/app/settings` | `src/modules/system/pages/SettingsPage.tsx` | ⚠️ Module-only | Settings lives entirely inside `src/modules/system` (src/modules/system/pages/SettingsPage.tsx:1-76). |
| `/app/resources/*` | `src/routes/resourceRoutes.tsx` | ✅ | Dedicated nested router maps to folders under `src/pages/resources` (src/routes/resourceRoutes.tsx:2-23). |
| `/app/section/:path/*` | `src/components/sections/DynamicSection.tsx` | ⚠️ Registry-driven | Dynamic sections bypass `/pages` and hydrate via the section registry + Supabase (src/components/sections/DynamicSection.tsx). |
| `/app/availability*` | Redirects only | ⚠️ Legacy pages unused | Both legacy pages exist but router only redirects to Enhanced Scheduling (src/router/index.tsx:224-229). |
| Missing routes | — | ❌ | There is no route for `src/pages/copilot/review.tsx`, so the page cannot be reached (compare router import block at src/router/index.tsx:10-58). |

## ✅ Active Modules
- `Dashboard`, `Employees`, `CompanyUpdates`, `Messages`, `Analytics`, `Reports` all render through `src/pages/*.tsx` with Suspense + hooks, giving production-ready UX (e.g., src/pages/Employees.tsx:1-13; src/pages/Messages.tsx:1-6).
- `LearningCenter` orchestrates catalog, analytics, and admin tabs tied to real Supabase data, plus admin-only edge function access (src/pages/LearningCenter.tsx:1-40; supabase/functions/learning-progress-history/index.ts:1-78).
- `Inventory` execution flows (Actions/Count Execution) now rely on the consolidated feature route and hooks like `useInventoryItems` (src/features/inventory/routes/Actions.tsx:1-40).
- `System Settings` delivers seven production tabs with shared error boundaries and lazy loading (src/modules/system/pages/SettingsPage.tsx:1-76).
- `Resources` route stack supports docs/blog/video through a dedicated router wrapper (src/routes/resourceRoutes.tsx:2-23).
- Supabase edge functions for AI analytics (e.g., learning progress history) are production-grade with schema guards and auth enforcement (supabase/functions/learning-progress-history/index.ts:1-80).

## ⚙️ Work-in-Progress / At-Risk Modules
- **Legacy availability pages**: `src/pages/availability/index.tsx` and `manage.tsx` still fetch and mutate Supabase data yet can no longer be reached because `/app/availability*` only redirects (src/router/index.tsx:224-229). Decide whether to integrate portions into Enhanced Scheduling or remove them.
- **Inventory double entry**: Router now imports `src/features/inventory/routes/Actions.tsx` while `src/pages/InventoryActions.tsx` remains, which invites divergence in permissions/business rules (src/router/index.tsx:35-36 vs src/pages/InventoryActions.tsx:1-70).
- **Events Meetings duplication**: Both `src/pages/events/Meetings.tsx` (static data) and `src/sections/events/Meetings.tsx` exist even though the router points `app/meetings` to `EventsHub` (src/router/index.tsx:124-134) and the section config only exposes the calendar (src/sections/events/section.config.ts:3-10).
- **Copilot Review & hooks**: `src/pages/copilot/review.tsx` and the `useCopilotOperations` hook (src/hooks/useCopilotOperations.ts:1-45) are not imported anywhere; wire them into routing/UI or archive them.
- **Rules engine service**: `src/services/rules/ruleRepository.ts` implements full CRUD mapping (src/services/rules/ruleRepository.ts:1-80) but nothing imports `@/services/rules`, so the feature is effectively dead code until a UI consumes it.
- **Documentation debt**: `docs/project-health-report.md` and `docs/ui-ux-audit-report.md` still use `${new Date()}` placeholders and assert perfect scores, which no longer reflects the current codebase (docs/project-health-report.md:1-20; docs/ui-ux-audit-report.md:1-40).
- **Supabase config**: `supabase/config.toml` only carries the `project_id` (supabase/config.toml:1), so function deployments and connection pooling options aren’t tracked alongside the repo. Consider adding the usual `[functions]` or `[db]` blocks.

## 🗑️ Safe-to-remove / Archive Candidates
| Path | Reason |
| --- | --- |
| `src/pages/availability/index.tsx` | Legacy “My Availability” UI cannot be reached after the router redirect (src/pages/availability/index.tsx:1-44 + src/router/index.tsx:224-229). |
| `src/pages/availability/manage.tsx` | Manager console mirrors the same redirect-only routes, so this heavy page is dead code (src/pages/availability/manage.tsx:1-44; src/router/index.tsx:224-229). |
| `src/pages/InventoryActions.tsx` | Feature parity now lives in `src/features/inventory/routes/Actions.tsx`; router no longer loads this page (src/pages/InventoryActions.tsx:1-70 vs src/router/index.tsx:35-36,200-202). |
| `src/pages/copilot/review.tsx` | Page and Supabase queries exist without any route/import, making it unreachable (src/pages/copilot/review.tsx:1-78; router import list at src/router/index.tsx:10-58). |
| `src/pages/events/Meetings.tsx` | Static meetings demo never mounts because `/app/meetings` points to `EventsHub` (src/pages/events/Meetings.tsx:1-60; src/router/index.tsx:124-134). |
| `src/sections/events/Meetings.tsx` | Section config only exposes the calendar page, so this component is never resolved (src/sections/events/Meetings.tsx:1-70; src/sections/events/section.config.ts:3-10). |
| `src/components/enhanced/LocalizedAuditLog.tsx` | Component is self-contained and isn’t imported anywhere else, so it can be dropped or merged into the real audit log (src/components/enhanced/LocalizedAuditLog.tsx:1-118). |
| `src/components/enhanced/LocalizedTemplateSelector.tsx` | Same as above—pure demo content without any consumers (src/components/enhanced/LocalizedTemplateSelector.tsx:1-120). |
| `scan-report.md` | Static list references non-existent files such as `src/pages/MessagesPage.tsx` (scan-report.md:5-30), so it misleads reviewers. |
| `FLOWFORCE_MVP_SCAN_TEMPLATE.md` | Blank template with underscored fields and no actionable data (FLOWFORCE_MVP_SCAN_TEMPLATE.md:1-27). |
| `docs/project-health-report.md` | Contains templated `${new Date().toISOString()}` strings and celebratory statements that are no longer accurate (docs/project-health-report.md:1-20). |
| `docs/ui-ux-audit-report.md` | Same issue as above; marketing-style boilerplate rather than a living document (docs/ui-ux-audit-report.md:1-40). |
| `structure.txt` | Hard-coded local tree (with `dist` artifacts and `.DS_Store`) that drifts immediately after builds (structure.txt:1-40). |
| `playwright-report/index.html` | Generated output from the last Playwright run; it should live in CI artifacts, not in the repo (playwright-report/index.html:4-12). |

## Duplicate / Overlapping Modules
- **Inventory**: Feature route + legacy page coexist (src/features/inventory/routes/Actions.tsx:1-40 vs src/pages/InventoryActions.tsx:1-70). Remove the page or keep it synced intentionally.
- **Operations**: Module re-export adds an unnecessary layer (src/modules/operations/pages/OperationsPage.tsx:1) while the actual UI lives in `src/pages/OperationsIntelligence.tsx`.
- **Events**: `Sections` and `Pages` versions of Meetings are both present even though the config only exposes the calendar (src/pages/events/Meetings.tsx:1-60; src/sections/events/Meetings.tsx:1-70; src/sections/events/section.config.ts:3-10).
- **Docs**: `scan-report.md`, `structure.txt`, and Flowforce templates duplicate information already tracked in living refactor plans (scan-report.md:5-40; structure.txt:1-40; FLOWFORCE_MVP_SCAN_TEMPLATE.md:1-27).
- **Rules & Copilot**: Services/hooks exist without front-end entry points (src/services/rules/ruleRepository.ts:1-80; src/hooks/useCopilotOperations.ts:1-45).

## Outdated / Generated Assets
- **Playwright + dist artifacts**: `playwright-report/index.html` and `dist/**` belong in CI outputs; keeping them under version control risks merge churn (playwright-report/index.html:4-12).
- **One-off audit docs**: `docs/project-health-report.md` and `docs/ui-ux-audit-report.md` still print template literals, so archiving them prevents confusion during actual audits (docs/project-health-report.md:1-34; docs/ui-ux-audit-report.md:1-40).
- **Flowforce/structure files**: `FLOWFORCE_MVP_SCAN_TEMPLATE.md`, `structure.txt`, and `folder-tree.txt` capture stale snapshots and can move to an external knowledge base if needed (structure.txt:1-40).

## Supabase, Server & Data Layer Notes
- `supabase/config.toml` only stores the project ID (supabase/config.toml:1). Capture function timeouts, database settings, and `functions.<name>` references so deploys remain reproducible.
- Two migrations share the same timestamp and exact SQL (`20250625033340-6b603f39-...a8d.sql` and `20250625033340-6b603f39-...708d1d114a8d.sql` both redefine the security helpers), which can break sequential deploys. Consolidate them into one script (see both files lines 1-34).
- Edge functions such as `learning-progress-history` are production ready with schema validation (supabase/functions/learning-progress-history/index.ts:1-80); keep shipping others to match this standard.
- Server-side helpers are located under `src/server` even though a `/server` root directory doesn’t exist; align documentation to point to `src/server` (src/server/vendorEvents.ts:1-44).

## Next Steps
1. Decide whether to wire or delete the unreachable React surfaces (availability, inventory legacy page, Copilot review, Meetings duplicates) and remove their unused hooks/services.
2. Prune or relocate generated reports/templates (`scan-report.md`, Flowforce docs, structure snapshots, Playwright report).
3. Update Supabase configuration + deduplicate migrations so deploy scripts know which SQL to run.
4. Keep `project-cleanup-report.md` up to date by revisiting this checklist after each refactor or release.
