# Supabase Migration Audit Report

## Executive Summary

**Total Migrations:** 196 files  
**Critical Issues Found:** Multiple patterns that will fail on fresh database  
**Status:** In progress - critical migrations fixed

## Critical Fixes Applied

### 1. Base Schema Migration (20250615033905)
**Status:** ✅ FIXED
- Added `IF NOT EXISTS` handling for CREATE TYPE (using DO block with exception handling)
- Added `IF NOT EXISTS` to all CREATE TABLE statements
- Added `ON CONFLICT DO NOTHING` to INSERT statements
- Added `DROP TRIGGER IF EXISTS` before CREATE TRIGGER
- Added conditional checks for foreign key constraints

### 2. Tasks & Workflows Migration (20250615035018)
**Status:** ✅ FIXED
- Added `IF NOT EXISTS` handling for all CREATE TYPE statements
- Added `IF NOT EXISTS` to all CREATE TABLE statements
- Added `IF NOT EXISTS` to all CREATE INDEX statements
- Added `DROP TRIGGER IF EXISTS` before all CREATE TRIGGER statements
- Added `DROP POLICY IF EXISTS` before all CREATE POLICY statements
- Added conditional check for foreign key constraint

### 3. Company Roles Migration (20250619015306)
**Status:** ✅ FIXED
- Fixed INSERT seed to check if `company_settings` table exists before referencing it
- Made `company_id` nullable initially, add foreign key constraint conditionally
- Fixed `get_company_roles` function to handle missing `company_settings` table
- Changed function from SQL to plpgsql for better error handling

### 4. Companies Table Migration (20250619023835)
**Status:** ✅ FIXED
- Added conditional checks for policies referencing `profiles.company_id` and `profiles.is_company_admin`
- Policies now use temporary permissive `USING (true)` with TODO comments when columns don't exist
- All policy creations wrapped in DO blocks with existence checks

## Remaining Issues to Fix

### Pattern 1: CREATE TYPE without duplicate handling
**Files Affected:** ~15 files  
**Fix:** Wrap in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`

### Pattern 2: CREATE TABLE without IF NOT EXISTS
**Files Affected:** ~93 files with 1105+ statements  
**Fix:** Add `IF NOT EXISTS` after `CREATE TABLE`

### Pattern 3: CREATE INDEX without IF NOT EXISTS
**Files Affected:** Many files  
**Fix:** Add `IF NOT EXISTS` after `CREATE INDEX`

### Pattern 4: CREATE TRIGGER without DROP first
**Files Affected:** Many files  
**Fix:** Add `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`

### Pattern 5: INSERT without ON CONFLICT
**Files Affected:** ~10 files with seed data  
**Fix:** Add `ON CONFLICT DO NOTHING` or `ON CONFLICT (key) DO NOTHING`

### Pattern 6: DROP without IF EXISTS
**Files Affected:** Some files  
**Fix:** Add `IF EXISTS` after `DROP`

### Pattern 7: Policies referencing tables/columns that may not exist
**Files Affected:** Multiple files  
**Fix:** Wrap policy creation in DO blocks with existence checks

### Pattern 8: Function signature conflicts (get_user_role, etc.)
**Status:** ✅ Mostly handled - migrations use DO blocks to drop all variants
**Note:** Some migrations may still need updates

## Priority Order for Remaining Fixes

1. **HIGH:** Migrations that create base tables (first 20 migrations)
2. **HIGH:** Migrations with INSERT seed data
3. **MEDIUM:** Migrations with CREATE INDEX statements
4. **MEDIUM:** Migrations with CREATE TRIGGER statements
5. **LOW:** Migrations that only add columns or modify existing structures

## Testing Plan

After fixes:
1. `supabase db reset` - should succeed
2. `supabase start` - should succeed
3. Verify all tables exist
4. Verify all functions exist
5. Verify RLS policies are active
6. Run application smoke tests

## Next Steps

1. Continue fixing remaining migrations systematically
2. Focus on migrations in chronological order
3. Test after each batch of fixes
4. Document any edge cases found
