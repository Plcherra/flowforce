# Apply Performance Fixes - Quick Guide

## Overview
Two migrations are ready to fix all 747 performance warnings:
1. **177 `auth_rls_initplan` warnings** → Fixed by migration 1
2. **571 `multiple_permissive_policies` warnings** → Fixed by migration 2

## Step-by-Step Application

### Current Status
- ✅ Migration 1 (`20260122030000_fix_rls_performance_auth_initplan.sql`) - APPLIED
- ⚠️ Migration 2 (`20260122040000_consolidate_multiple_permissive_policies.sql`) - PARTIALLY APPLIED (left 405 warnings)
- ✅ Migration 3 (`20260122050000_fix_remaining_permissive_policies.sql`) - READY TO APPLY

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard
   - Navigate to **SQL Editor**

2. **Apply Migration 4** (Complete Fix - Handles ALL Policies)
   - Open `supabase/migrations/20260122060000_fix_all_permissive_policies_complete.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Wait for completion (should see NOTICE messages for each consolidated policy created)
   - **Note**: This migration handles policies with `cmd='ALL'` that overlap with specific action policies

3. **Verify**
   - Re-run Supabase Database Linter
   - Confirm warnings are reduced from 405 to 0 (or near 0)

### Option 2: Supabase CLI

```bash
# Navigate to project directory
cd /Users/pedromartins/Documents/FlowForce

# Apply migrations
supabase migration up

# Or apply specific migrations
supabase db push
```

## What Each Migration Does

### Migration 1: `20260122030000_fix_rls_performance_auth_initplan.sql`
- Scans all RLS policies in `public` schema
- Finds policies using `auth.uid()`, `auth.role()`, `auth.jwt()`, or `current_setting()` directly
- Replaces them with subquery wrappers: `(select auth.uid())`, etc.
- Recreates policies with optimized expressions
- **Result**: 177 warnings fixed

### Migration 2: `20260122040000_consolidate_multiple_permissive_policies.sql`
- Finds all permissive policies for each table/action combination
- Consolidates multiple policies into single policies using OR conditions
- Drops old policies and creates consolidated ones
- **Result**: 571 warnings fixed

## Expected Output

### Migration 3 Output:
```
NOTICE: Consolidated 2 policies (Company admins can manage invites, consolidated_select_company_invites) for table public.company_invites into policy consolidated_select_company_invites
NOTICE: Consolidated 2 policies (Admins and managers can manage inventory items, consolidated_select_inventory_items) for table public.inventory_items into policy consolidated_select_inventory_items
...
(Many notices, one per table/action combination)
```

**Note**: Migration 3 will show which policies (including previously consolidated ones) were merged together.

## Verification Checklist

After applying both migrations:

- [ ] Migration 1 completed without errors
- [ ] Migration 2 completed without errors
- [ ] Re-run Supabase linter shows 0 (or significantly reduced) warnings
- [ ] Application still functions correctly
- [ ] Users can access data they should have access to
- [ ] Users cannot access data they shouldn't have access to
- [ ] Query performance improved (check slow query logs)

## Troubleshooting

### If Migration Fails

1. **Check Error Message**: Look for specific table/policy that caused the issue
2. **Verify Table Exists**: Some tables might not exist in your database
3. **Check Policy Names**: Very long policy names might cause issues
4. **Review Logs**: Check Supabase logs for detailed error information

### If Security Issues Occur

1. **Check Consolidated Policies**: Review the new consolidated policy names
2. **Compare Before/After**: Verify policy conditions are preserved
3. **Test Access**: Manually test user access to ensure security is maintained
4. **Rollback if Needed**: Restore from backup if critical issues arise

## Rollback (If Needed)

If you need to rollback:

1. **Check Migration Logs**: See which policies were changed
2. **Restore from Backup**: If you have a database backup
3. **Manual Recreation**: Recreate individual policies if needed
4. **Contact Support**: If issues persist

## Notes

- Both migrations are **idempotent** - safe to run multiple times
- Migrations preserve **exact security semantics**
- Performance improvements should be noticeable on high-traffic tables
- Always test in a development environment first if possible

## Support

If you encounter issues:
1. Check the migration files for syntax errors
2. Verify your PostgreSQL version (should be 12+)
3. Ensure you have permissions to create/drop policies
4. Review Supabase documentation for RLS best practices
