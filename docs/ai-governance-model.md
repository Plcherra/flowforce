# AI Governance Model

Date: 2026-05-29

## Purpose

Phase 07.01 makes AI a controlled product capability. AI can read tenant-scoped context and recommend work, but it cannot become an uncontrolled side door into writes, secrets, payroll detail, raw PII, or cross-tenant data.

## Action Levels

FlowForce uses four AI action levels:

- `read_only_insight`: summarizes tenant-scoped operational facts and does not create product records.
- `suggested_action`: drafts a recommendation, task, schedule adjustment, reorder idea, or coaching follow-up for review.
- `approved_action`: executes an AI-originated write only after a permitted user approves the exact scoped action.
- `automated_action`: executes only pre-approved, low-risk automations with tenant budget controls, audit logging, and rollback expectations.

## Permissions

AI permissions are separated so access can be granted narrowly:

- `ai.insights.view`: view AI-generated guidance.
- `ai.actions.suggest`: ask AI to draft operational recommendations.
- `ai.actions.approve`: approve AI-originated writes.
- `ai.actions.automate`: enable pre-approved automation.
- `ai.audit.view`: review AI audit trails and governance status.
- `ai.governance.manage`: configure AI scopes, restricted modules, and automation level.

The existing `viewAIInsights` permission remains as a compatibility alias for read-only insight access.

## Audit Requirements

Every AI capability must write or preserve enough audit detail to answer:

- who requested or approved the action.
- which tenant and module were involved.
- which action level was used.
- which records or metrics were referenced.
- which model/provider was used when a model call exists.
- whether the result was viewed, suggested, approved, automated, rejected, failed, or skipped.

Canonical audit event names start with:

- `ai.insight.generated`
- `ai.suggestion.created`
- `ai.action.approved`
- `ai.automation.executed`
- `ai.action.rejected`
- `ai.provider.failed`
- `ai.governance.updated`

## Data Access Rules

Allowed for AI context:

- tenant operational summaries.
- aggregated financial metrics.
- workflow exception metadata.
- schedule coverage metadata.
- inventory and cost metrics.
- minimum employee profile fields needed for role, assignment, and availability reasoning.

Blocked from AI context by default:

- raw PII.
- payroll detail.
- secret material.
- cross-tenant data.
- service-role credentials.
- unrestricted file contents.
- support-only diagnostics.

## Database Contract

The baseline installer is:

```sql
select public.install_ai_governance_baseline(company_id);
```

The installer is the audited mutation path. Tenant users can read scoped governance rows, but authenticated clients cannot directly insert, update, or delete AI governance policies.

Readiness is exposed through:

```sql
select * from public.ai_governance_readiness_v;
```

The readiness view must show all four action levels, sensitive data blocks, and audit events before Phase 07.02 can build the AI context layer.

## Verification

Run:

```bash
npm run check:ai-governance
supabase test db --local supabase/tests/phase7_ai_governance_model.test.sql
```
