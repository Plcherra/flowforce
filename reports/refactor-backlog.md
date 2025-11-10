# Refactor Backlog (≥500 LOC)

Pulled from `project-cleanup-phase2.md` and `scan-report.md`, this backlog lists every active file at or above 500 LOC. Treat each row as a mini-project: define owners, carve out sub-components/hooks, and add targeted tests before shipping large rewrites.

| Path | Approx. LOC | Primary Area | Refactor Intent |
| --- | --- | --- | --- |
| `src/integrations/supabase/types.ts` | 5458 | Shared data contracts | Split/generated typings per schema module to reduce bundle churn. |
| `src/pages/availability/manage.tsx` | 1030 | Scheduling / Availability | Break into provider-aware tabs before migrating flows into Enhanced Scheduling. |
| `src/components/inventory/InventoryItemForm.tsx` | 980 | Inventory | Extract shared field groups & API hooks for reuse in routes/Actions. |
| `src/components/scheduling/DragDropScheduleCalendar.tsx` | 892 | Scheduling | Modularize drag/drop + rendering logic to unlock automated tests. |
| `src/components/cookbook/RecipeDetailDialog.tsx` | 873 | Knowledge base | Decompose dialog (header, metrics, actions) or feature-flag heavy sections. |
| `src/components/forms/FormFillDialog.tsx` | 843 | Forms / Operations | Split viewer vs editor panes; enforce typed form schema hooks. |
| `src/components/ui/sidebar.tsx` | 814 | Navigation | Componentize sections + animation helpers to simplify permissions logic. |
| `src/components/scheduling/AddShiftDialog.tsx` | 788 | Scheduling | Convert to wizard with child components & extracted validation. |
| `src/components/availability/AvailabilityRequestForm.tsx` | 688 | Scheduling | Separate grid rendering from Supabase IO to share with new tabs. |
| `src/components/forms/builder/FieldEditor.tsx` | 685 | Forms Builder | Break out per-field editors + state machines for clarity. |
| `src/components/onboarding/BrandingCustomizer.tsx` | 643 | Onboarding | Split upload, preview, and theming logic into reusable hooks. |
| `src/pages/Employees.tsx` | 595 | People Ops | Promote feature components & data hooks out of the page wrapper. |
| `src/services/inventory.ts` | 542 | Inventory Services | Divide by domain (items, counts, transfers) ahead of typed repos. |
| `src/contexts/SchedulingContext.tsx` | 531 | Scheduling Context | Slice provider into focused stores (shifts, locks, requests). |
| `src/components/onboarding/OnboardingRoleManager.tsx` | 517 | Onboarding | Break down table, dialog, and assignment logic into sub-components. |
| `src/services/scheduling/autoScheduler.ts` | 510 | Scheduling Automation | Separate heuristics from IO and document algorithm hooks. |
| `src/pages/CompanyUpdates.tsx` | 508 | Communications | Move Supabase calls + analytics cards into feature modules. |
