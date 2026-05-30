# 07.01 AI Governance Model

Date: 2026-05-29

## Summary

Created the AI governance baseline for Plan 07. FlowForce now has an explicit model for read-only insights, suggested actions, approved actions, and automated actions before later phases add richer AI context and prompt contracts.

## Added

- Governance doc: `docs/ai-governance-model.md`
- Service contract: `src/services/ai/aiGovernance.ts`
- Migration: `supabase/migrations/20260529000100_phase7_ai_governance_model.sql`
- DB contract test: `supabase/tests/phase7_ai_governance_model.test.sql`
- Contract checker: `scripts/check-ai-governance-contract.mjs`

## Product Contract

- Read-only insight can summarize tenant-scoped operational facts without product writes.
- Suggested action can draft recommendations, but writes remain blocked.
- Approved action requires a permitted user to approve the exact scoped action.
- Automated action is limited to pre-approved, low-risk workflows with audit and budget controls.

## Database Contract

The installer is:

```sql
select public.install_ai_governance_baseline(company_id);
```

Readiness is exposed through:

```sql
select * from public.ai_governance_readiness_v;
```

## Verification

Run:

```bash
npm run check:ai-governance
supabase test db --local supabase/tests/phase7_ai_governance_model.test.sql
```

## Next

Phase 07.02: AI Context Layer.
