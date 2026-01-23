# Final Performance Fix - Complete Policy Consolidation

## Issue
After applying previous migrations, 405 `multiple_permissive_policies` warnings remain because:
1. Policies with `cmd = 'ALL'` overlap with specific action policies (SELECT, INSERT, UPDATE, DELETE)
2. Some original policies weren't caught by previous consolidations
3. Multiple consolidated policies exist for the same table/action

## Root Cause
In PostgreSQL RLS:
- A policy with `cmd = 'ALL'` applies to **all actions** (SELECT, INSERT, UPDATE, DELETE)
- When evaluating a SELECT query, PostgreSQL checks:
  - Policies with `cmd = 'SELECT'`
  - Policies with `cmd = 'ALL'`
- This causes multiple permissive policies to be evaluated for the same action

## Solution: Migration `20260122060000_fix_all_permissive_policies_complete.sql`

This migration:
1. **Collects all policies** for each table (including 'ALL' policies)
2. **For each action type** (SELECT, INSERT, UPDATE, DELETE):
   - Finds policies with `cmd = action_type`
   - Finds policies with `cmd = 'ALL'`
   - Consolidates them into a single policy
3. **Drops all old policies** (original and previously consolidated)
4. **Creates new consolidated policies** per action type

## Key Differences from Previous Migrations

| Migration | What It Did | What It Missed |
|-----------|-------------|----------------|
| `20260122040000` | Consolidated policies by action type separately | Didn't handle 'ALL' policies overlapping with specific actions |
| `20260122050000` | Tried to fix remaining overlaps | Still didn't handle 'ALL' policies correctly |
| `20260122060000` | **Consolidates 'ALL' policies into each action type** | ✅ Complete solution |

## Example

**Before:**
```sql
-- Policy 1: Applies to SELECT
CREATE POLICY "Users can view" ON table FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Applies to ALL actions (including SELECT)
CREATE POLICY "Admins can manage" ON table FOR ALL USING (is_admin(auth.uid()));
```

**After:**
```sql
-- Single consolidated policy for SELECT (includes both conditions)
CREATE POLICY "consolidated_select_table" ON table FOR SELECT 
USING ((user_id = (select auth.uid())) OR (is_admin((select auth.uid()))));

-- Single consolidated policy for INSERT (includes 'ALL' policy)
CREATE POLICY "consolidated_insert_table" ON table FOR INSERT 
WITH CHECK (is_admin((select auth.uid())));

-- Similar for UPDATE and DELETE...
```

## Apply the Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260122060000_fix_all_permissive_policies_complete.sql`
3. Paste and run
4. Verify: Re-run Supabase linter - should show **0 warnings**

## Expected Results

- ✅ All 405 remaining warnings resolved
- ✅ One policy per table per action type
- ✅ No overlaps between policies
- ✅ Optimal query performance
- ✅ Security preserved (same access rules, just consolidated)

## Notes

- The migration creates policies with names like `consolidated_select_table_name`
- Old policies (including previous consolidated ones) are dropped
- Policies are optimized with `(select auth.uid())` wrappers from migration 1
- This is the **final** migration needed for performance warnings
