# 09 Integrations And Migration Tools

## Goal

Make FlowForce easy to adopt by importing data from existing tools and connecting to the systems restaurant/retail businesses already use.

## Phases

### Phase 1: Integration Strategy

- [x] Rank integrations by pilot value.
- [x] Separate imports, exports, syncs, and live APIs.
- [x] Define OAuth/API-key storage rules.
- [x] Define integration logging and retry needs.

Acceptance:

- Integrations are prioritized by adoption friction and ROI.

Verification:

- Integration roadmap matches product positioning.

Status:

- Completed on 2026-05-30.
- Strategy: [Integration Strategy](../integration-strategy.md)
- Contract: `src/services/integrations/integrationStrategy.ts`
- Checker: `npm run check:integration-strategy`
- Phase report: [09.01 Integration Strategy](./reports/09-01-integration-strategy-2026-05-30.md)

### Phase 2: CSV Import Framework

- [x] Build generic CSV upload, mapping, preview, validation, and import result flow.
- [x] Add rollback/error reporting.
- [x] Add import audit logs.
- [x] Add templates for employees, inventory items, suppliers, schedules, and tasks.

Acceptance:

- Customers can migrate basic data without custom SQL.

Verification:

- Import tests cover valid and invalid files.

Status:

- Completed on 2026-05-30.
- Framework: [CSV Import Framework](../csv-import-framework.md)
- Contract: `src/services/integrations/csvImportFramework.ts`
- Migration: `supabase/migrations/20260530000200_phase9_csv_import_framework.sql`
- Checker: `npm run check:csv-import-framework`
- Phase report: [09.02 CSV Import Framework](./reports/09-02-csv-import-framework-2026-05-30.md)

### Phase 3: Workforce Platform Migration Path

- [x] Define imported data: employees, roles, schedules, tasks, messages where possible.
- [x] Create mapping docs.
- [x] Add CSV/import adapters.
- [x] Add migration completion report.

Acceptance:

- A workforce platform customer has a path into FlowForce.

Verification:

- Sample import creates expected tenant data.

Status:

- Completed on 2026-05-30.
- Mapping: [Workforce Platform Migration Path](../workforce-platform-migration.md)
- Contract: `src/services/integrations/workforceMigrationPath.ts`
- Checker: `npm run check:workforce-migration`
- Phase report: [09.03 Workforce Platform Migration Path](./reports/09-03-workforce-platform-migration-2026-05-30.md)

### Phase 4: Checklist Platform Migration Path

- [x] Define imported data: checklists, SOPs, forms, locations, recurring tasks.
- [x] Add template mapping.
- [x] Add import preview and validation.
- [x] Add post-import workflow review.

Acceptance:

- Checklist-driven operations can be recreated in FlowForce.

Verification:

- Sample checklist imports into executable workflow templates.

Status:

- Completed on 2026-05-30.
- Mapping: [Checklist Platform Migration Path](../checklist-platform-migration.md)
- Contract: `src/services/integrations/checklistMigrationPath.ts`
- Checker: `npm run check:checklist-migration`
- Phase report: [09.04 Checklist Platform Migration Path](./reports/09-04-checklist-platform-migration-2026-05-30.md)

### Phase 5: MarketMan Migration Path

- [x] Define imported data: items, units, suppliers, purchases, recipes, counts, waste.
- [x] Add unit conversion validation.
- [x] Add cost basis validation.
- [x] Add inventory setup completeness report.

Acceptance:

- MarketMan customers can move inventory data safely.

Verification:

- Sample inventory import supports cost engine calculations.

Status:

- Completed on 2026-05-30.
- Mapping: [MarketMan Migration Path](../marketman-migration-path.md)
- Contract: `src/services/integrations/marketmanMigrationPath.ts`
- Checker: `npm run check:marketman-migration`
- Phase report: [09.05 MarketMan Migration Path](./reports/09-05-marketman-migration-2026-05-30.md)

### Phase 6: POS Integration Foundation

- [x] Choose first POS target, likely Toast or Square.
- [x] Define sales, menu item, labor, and location sync needs.
- [x] Add secure credential model.
- [x] Add integration health UI.

Acceptance:

- POS integration has a safe foundation before live sync.

Verification:

- Integration config is tenant-scoped and audited.

Status:

- Completed on 2026-05-30.
- Foundation: [POS Integration Foundation](../pos-integration-foundation.md)
- Contract: `src/services/integrations/posIntegrationFoundation.ts`
- Checker: `npm run check:pos-integration-foundation`
- Phase report: [09.06 POS Integration Foundation](./reports/09-06-pos-integration-foundation-2026-05-30.md)

### Phase 7: Accounting And Payroll Integrations

- [x] Define QuickBooks/Xero export scope.
- [x] Define payroll/labor import scope.
- [x] Add export logs and retry behavior.
- [x] Add reconciliation views.

Acceptance:

- Finance data can leave FlowForce cleanly.

Verification:

- Export files/API payloads match expected schemas.

Status:

- Completed on 2026-05-30.
- Foundation: [Accounting And Payroll Integrations](../accounting-payroll-integrations.md)
- Contract: `src/services/integrations/accountingPayrollIntegrations.ts`
- Checker: `npm run check:accounting-payroll-integrations`
- Phase report: [09.07 Accounting And Payroll Integrations](./reports/09-07-accounting-payroll-integrations-2026-05-30.md)

### Phase 8: Webhooks And Public API

- [x] Define API key model.
- [x] Add webhook subscriptions.
- [x] Add event catalog.
- [x] Add rate limits and audit logs.

Acceptance:

- FlowForce can become a platform without exposing unsafe APIs.

Verification:

- API/webhook tests cover auth, tenant scoping, and retries.

Status:

- Completed on 2026-05-30.
- Foundation: [Webhooks And Public API](../public-api-webhooks.md)
- Contract: `src/services/integrations/publicApiWebhooks.ts`
- Checker: `npm run check:public-api-webhooks`
- Phase report: [09.08 Webhooks And Public API](./reports/09-08-public-api-webhooks-2026-05-30.md)

### Phase 9: Integration Monitoring

- [x] Add sync status dashboard.
- [x] Add last successful sync, failures, retries, and warnings.
- [x] Add alerting for broken critical syncs.
- [x] Add support diagnostics.

Acceptance:

- Integrations are observable and supportable.

Verification:

- Simulated failures appear clearly.

Status:

- Completed on 2026-05-30.
- Foundation: [Integration Monitoring](../integration-monitoring.md)
- Contract: `src/services/integrations/integrationMonitoring.ts`
- Checker: `npm run check:integration-monitoring`
- Phase report: [09.09 Integration Monitoring](./reports/09-09-integration-monitoring-2026-05-30.md)

### Phase 10: Migration And Integration Signoff

- [x] Create customer migration playbook.
- [x] Create sample data packs.
- [x] Add demo migration flow.
- [x] Update roadmap status.

Acceptance:

- Switching to FlowForce feels practical, not scary.

Verification:

- A test tenant can be populated from migration samples.

Status:

- Completed on 2026-05-30.
- Signoff: [Migration And Integration Signoff](../migration-and-integration-signoff.md)
- Contract: `src/services/integrations/migrationIntegrationSignoff.ts`
- Checker: `npm run check:migration-integration-signoff`
- Phase report: [09.10 Migration And Integration Signoff](./reports/09-10-migration-integration-signoff-2026-05-30.md)
