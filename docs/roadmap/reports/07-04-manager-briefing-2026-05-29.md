# 07.04 Manager Briefing

Date: 2026-05-29

## Outcome

Plan 07.04 is complete. FlowForce now has a read-only manager briefing path that uses tenant AI context, the `manager_briefing` prompt contract, evidence routes, stored refresh runs, and audit logging.

## Completed Work

- Added `ai_manager_briefing_runs` to store daily read-only briefing refreshes.
- Added `refresh_ai_manager_briefing(company_id)` to produce today's operations briefing from tenant-scoped context.
- Added `ai_manager_briefing_latest_v` and `ai_manager_briefing_readiness_v`.
- Added evidence links for scheduling, inventory, tasks, operations, forms, employees, and cost routes.
- Added audit logging with `ai.manager_briefing.generated`.
- Added TypeScript helpers for deterministic briefing drafts, validation, evidence links, and safety checks.
- Added DB and local contract tests for tenant scoping, evidence links, read-only output, and audit logging.

## Files

- Documentation: [docs/ai-manager-briefing.md](../../ai-manager-briefing.md)
- Service contract: [src/services/ai/aiManagerBriefing.ts](../../../src/services/ai/aiManagerBriefing.ts)
- Migration: [20260529000400_phase7_manager_briefing.sql](../../../supabase/migrations/20260529000400_phase7_manager_briefing.sql)
- DB test: [phase7_manager_briefing.test.sql](../../../supabase/tests/phase7_manager_briefing.test.sql)
- Contract check: [scripts/check-ai-manager-briefing-contract.mjs](../../../scripts/check-ai-manager-briefing-contract.mjs)

## Verification

- `npm run check:ai-manager-briefing`
- `npm run check:local`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_manager_briefing.test.sql`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.05: Scheduling Assistant should use the same guarded pattern to draft schedule suggestions without silently publishing schedules.
