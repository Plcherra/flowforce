# CSV Import Framework

Date: 2026-05-30
Roadmap phase: 09.02 CSV Import Framework

## Goal

FlowForce needs a repeatable migration path that lets a customer load basic operating data without custom SQL, one-off scripts, or unsafe support access.

09.02 creates the generic framework. Later Plan 09 phases can add provider-specific adapters on top of the same mapping, preview, validation, result, audit, and rollback model.

## Supported Templates

The first templates are:

- Employees: first name, last name, email, role, department, phone.
- Inventory items: item name, SKU, unit, category, par level, unit cost.
- Suppliers: supplier name, contact name, email, phone, payment terms.
- Schedules: employee email, shift date, start time, end time, role, location.
- Tasks: title, description, assignee email, due date, priority.

The canonical contract lives in `src/services/integrations/csvImportFramework.ts`.

Each template defines:

- Required fields.
- Header aliases for mapping.
- Example row values for downloadable templates.
- Target table.
- Rollback strategy.

## Flow

1. Upload CSV.
2. Parse headers and rows.
3. Infer mapping from known aliases.
4. Let the user correct unmapped fields.
5. Preview mapped rows.
6. Validate required values and field types.
7. Create an import batch.
8. Write valid rows through trusted import handlers.
9. Store row outcomes and target record ids.
10. Return an import result with rollback availability and error report.

No raw provider credentials are needed for this phase.

## Validation

The framework validates:

- Missing headers.
- Missing required mappings.
- Missing required values.
- Email shape.
- Number fields.
- ISO date fields.
- HH:mm time fields.
- Enum values such as employee role and task priority.

Invalid files do not import. Warning rows can import when there are no blocking errors.

## Audit And Rollback

The migration `20260530000200_phase9_csv_import_framework.sql` adds:

- `integration_import_batches`
- `integration_import_rows`
- `integration_import_batch_summary_v`
- `record_integration_import_audit(company_id, batch_id, action, status, metadata)`
- `mark_integration_import_batch_status(batch_id, status, summary, error_report, rollback_reference)`
- `integration_import_readiness()`

Audit actions are:

- `integration.csv_import.started`
- `integration.csv_import.validated`
- `integration.csv_import.completed`
- `integration.csv_import.failed`
- `integration.csv_import.rolled_back`

Rows store source data, mapped data, target table, target record id, error report, and rollback payload. A completed batch can expose a rollback reference when target record ids were captured.

## Tenant Safety

The import ledger is company-scoped and protected by RLS through `current_user_company_ids()`.

Customers can inspect only their own batches and row results. Import status changes write audit rows with the active user as actor.

## Verification

09.02 is complete when:

- `npm run check:csv-import-framework` passes.
- Valid CSV examples create import previews that can import.
- Invalid CSV examples produce blocking validation errors.
- Roadmap, docs, migration, audit events, package scripts, and contract service stay aligned.
