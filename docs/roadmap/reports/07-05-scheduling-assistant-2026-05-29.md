# 07.05 Scheduling Assistant

Date: 2026-05-29

## Outcome

Plan 07.05 is complete. FlowForce now has approval-gated scheduling suggestions that can detect coverage gaps, possible under/overstaffing, replacement review needs, and labor-cost review signals without silently publishing schedules.

## Completed Work

- Added `ai_scheduling_suggestions` for pending, approved, and rejected AI scheduling suggestions.
- Added `refresh_ai_scheduling_suggestions(company_id)` to create tenant-scoped scheduling suggestions from AI context.
- Added `review_ai_scheduling_suggestion(suggestion_id, decision, comments)` to approve/reject suggestions without writing schedule rows.
- Added readiness/latest views for scheduling assistant suggestions.
- Added audit logging for suggestion creation, approval, and rejection.
- Added TypeScript helpers for deterministic scheduling suggestions, prompt validation, evidence, and safety checks.
- Added DB and local contract tests for tenant scoping, approval gating, no direct writes, evidence links, and audit logging.

## Files

- Documentation: [docs/ai-scheduling-assistant.md](../../ai-scheduling-assistant.md)
- Service contract: [src/services/ai/aiSchedulingAssistant.ts](../../../src/services/ai/aiSchedulingAssistant.ts)
- Migration: [20260529000500_phase7_scheduling_assistant.sql](../../../supabase/migrations/20260529000500_phase7_scheduling_assistant.sql)
- DB test: [phase7_scheduling_assistant.test.sql](../../../supabase/tests/phase7_scheduling_assistant.test.sql)
- Contract check: [scripts/check-ai-scheduling-assistant-contract.mjs](../../../scripts/check-ai-scheduling-assistant-contract.mjs)

## Verification

- `npm run check:ai-scheduling-assistant`
- `npm run check:local`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_scheduling_assistant.test.sql`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.06: Inventory And Waste Assistant should follow the same suggestion-first, approval-gated model for reorder, prep, and waste adjustments.
