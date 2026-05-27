# 03.07 Data Lifecycle And Retention

Date: 2026-05-27

## Summary

Phase 03.07 gives customer data a lifecycle contract: soft-delete/archive metadata, export tracking, legal holds, retention defaults, and a verification script.

## Completed

- Defined lifecycle states for active, archive pending, archived, delete pending, deleted, and legal hold records.
- Added `company_data_exports` for tenant export request tracking.
- Added `lifecycle_legal_holds` for tenant-scoped legal hold protection.
- Added lifecycle metadata columns to core tenant tables where present.
- Added indexes for lifecycle status and active tenant records.
- Defined retention classes and defaults in `DATA_LIFECYCLE_POLICY`.
- Documented deletion, archival, export, restore, legal hold, and retention behavior in `docs/data-lifecycle-and-retention.md`.
- Added `npm run check:lifecycle` to guard the lifecycle contract.

## Verification

- `npm run check:lifecycle`
- `npm run check:local`
- `npm run typecheck`
- `npm run build`

## Notes

- This phase creates the contract and schema foundation only.
- It intentionally does not add an automatic purge job or tenant delete button.
- The migration must be pushed before export request tracking or legal holds are available in the remote database.
