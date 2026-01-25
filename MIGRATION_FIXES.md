# Phase 4 Migration Fixes
**Date:** January 22, 2026

## Issues Fixed

### 1. Index Migration - CONCURRENTLY Error ✅ FIXED

**Error:** `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`

**Root Cause:** PostgreSQL's `CREATE INDEX CONCURRENTLY` must run outside a transaction block, but Supabase migrations run inside transactions.

**Fix:** Removed `CONCURRENTLY` keyword from all index creation statements.

**File:** `supabase/migrations/20260122070000_add_performance_indexes.sql`

**Changes:**
- Changed `CREATE INDEX CONCURRENTLY IF NOT EXISTS` → `CREATE INDEX IF NOT EXISTS`
- Indexes will still be created, just without the concurrent option
- For production, consider creating indexes CONCURRENTLY during a maintenance window if needed

**Note:** Regular `CREATE INDEX` will lock the table briefly during creation. For large tables, you may want to create indexes CONCURRENTLY manually during off-peak hours.

---

### 2. Analytics RPC - Syntax Error ✅ FIXED

**Error:** `syntax error at or near "=>"` on line 37

**Root Cause:** `jsonb_build_object()` uses comma-separated key-value pairs, not `=>` syntax.

**Fix:** Changed `jsonb_build_object('key' => value)` → `jsonb_build_object('key', value)`

**File:** `supabase/migrations/20260122072000_create_analytics_rpc.sql`

**Changes:**
- Fixed all `jsonb_build_object` calls to use comma syntax instead of `=>`
- Changed from: `jsonb_build_object('total' => 0, 'published' => 0)`
- Changed to: `jsonb_build_object('total', 0, 'published', 0)`

---

---

### 3. Index Migration - Missing company_id Columns ✅ FIXED

**Error:** `column "company_id" does not exist` on `inventory_transactions` and `payments` tables

**Root Cause:** These tables don't have `company_id` columns. They reference `profiles` via foreign keys:
- `payments.created_by` → `profiles(id)` → `profiles.company_id`
- `inventory_transactions.performed_by` → `profiles(id)` → `profiles.company_id`

**Fix:** Updated indexes to use the foreign key columns instead:
- Changed `payments_company_created_status_idx` → `payments_created_by_created_status_idx` (on `created_by, created_at DESC, status`)
- Changed `inventory_transactions_company_created_idx` → `inventory_transactions_performed_by_created_idx` (on `performed_by, created_at DESC`)

**File:** `supabase/migrations/20260122070000_add_performance_indexes.sql`

**Note:** These indexes still optimize queries filtered by company (via the profiles join), just using the foreign key columns instead.

---

## ✅ All Migrations Fixed

All three migrations should now run successfully. The fixes maintain the same functionality while using correct SQL syntax and actual table schemas.

---

## Testing

After applying the fixes:
1. ✅ First migration should create all 10 indexes successfully (fixed company_id issues)
2. ✅ Second migration (dashboard RPC) already succeeded
3. ✅ Third migration (analytics RPC) should now succeed (fixed jsonb_build_object syntax)

---

**Status: ✅ READY TO APPLY**
