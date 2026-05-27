# Data Lifecycle And Retention

Date: 2026-05-27

## Scope

FlowForce data now has a v1 lifecycle contract. The goal is to make customer data exportable, restorable during a short recovery window, protectable by legal hold, and eventually purgeable by policy instead of ad hoc SQL.

This phase does not implement an automated deletion worker. It creates the schema and product contract that deletion, export, support, and compliance tooling must follow.

## Lifecycle States

Lifecycle-managed records use:

- `active`: normal operational state.
- `archive_pending`: queued for archival after product or support approval.
- `archived`: hidden from day-to-day workflows but retained.
- `delete_pending`: queued for purge after export, legal-hold, and recovery checks.
- `deleted`: soft-deleted and excluded from active product views.
- `legal_hold`: protected from archival or purge.

The database columns are:

- `lifecycle_status`
- `archived_at`
- `deleted_at`
- `retention_hold_until`

The canonical TypeScript policy registry lives in [dataLifecyclePolicy.ts](/Users/pedromartins/Documents/flowforce/src/services/lifecycle/dataLifecyclePolicy.ts).

## Export Plan

Company exports are tracked in `company_data_exports`.

Export statuses are:

- `requested`
- `processing`
- `ready`
- `failed`
- `expired`

The first shippable export path should:

1. Create a `company_data_exports` row.
2. Snapshot tenant-owned operational tables by `company_id`.
3. Include root tenant settings, profiles, memberships, roles, forms, schedules, tasks, messages, inventory, finance, documents, reports, audit metadata, and legal holds.
4. Write the generated archive path to `download_path`.
5. Set `expires_at` so export files are temporary.
6. Log an audit event for request, completion, failure, and download.

Export requests are admin-only through RLS.

## Legal Holds

Legal holds are tracked in `lifecycle_legal_holds`.

An active legal hold blocks archival and purge for either:

- a whole table within a tenant, when `target_record_id` is null.
- a specific record, when `target_record_id` is set.

Legal holds are admin-only and must be audited when created or released.

## Retention Defaults

Default retention policy:

- Tenant configuration: 7 years, archive then delete.
- Employee profiles and memberships: 3 years, soft delete.
- Operational records: 2 to 3 years, archive then delete.
- Financial records: 7 years, retain.
- Audit records: 7 years, retain.
- Generated reports/documents: 3 years, archive then delete.
- System cache: 1 year, purge when recreated safely.

These defaults are a product baseline, not legal advice. Customer contracts and jurisdiction-specific obligations can override them through legal holds or tenant policy settings in a later phase.

## Restore Rules

Restore is allowed only while a record is still soft-deleted or archived and still inside its `restoreWindowDays` policy.

Restore must:

- require tenant admin or support authorization.
- clear `deleted_at` only when no purge has occurred.
- set `lifecycle_status` back to `active`.
- preserve audit history.
- write a restore audit event.

Records with `restoreWindowDays: 0`, such as audit rows and generated cache, are not user-restorable.

## Product Rules

- Product views should exclude `deleted_at is not null` records unless they are explicit archive/support views.
- Hard deletes must be service-role only and must check legal holds first.
- Tenant deletion must create or verify an export before purge.
- File storage lifecycle must follow the owning database record lifecycle.
- Support tooling must prefer soft delete, archive, and restore actions over raw SQL.

## Verification

Run:

```bash
npm run check:lifecycle
```

This confirms the lifecycle policy registry, database migration, export tracking, legal holds, docs, and roadmap status stay aligned.
