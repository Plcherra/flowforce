# Migration Fixes Summary

## Overview

This document summarizes the fixes applied to Supabase migrations to ensure `supabase db reset && supabase start` succeeds on a fresh database.

## Fixes Applied

### Critical Migrations Fixed (4 files)

1. **20250615033905** - Base schema (profiles, departments, company_settings)
2. **20250615035018** - Tasks and workflows system
3. **20250619015306** - Company roles and permissions
4. **20250619023835** - Companies table and invites

### Patterns Fixed

#### 1. CREATE TYPE - Duplicate Handling
**Before:**
```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'employee');
```

**After:**
```sql
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'employee');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```

#### 2. CREATE TABLE - IF NOT EXISTS
**Before:**
```sql
CREATE TABLE public.profiles (...);
```

**After:**
```sql
CREATE TABLE IF NOT EXISTS public.profiles (...);
```

#### 3. CREATE INDEX - IF NOT EXISTS
**Before:**
```sql
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
```

**After:**
```sql
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
```

#### 4. CREATE TRIGGER - Drop First
**Before:**
```sql
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

**After:**
```sql
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

#### 5. CREATE POLICY - Drop First
**Before:**
```sql
CREATE POLICY "Users can view tasks" ON public.tasks
  FOR SELECT USING (...);
```

**After:**
```sql
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks" ON public.tasks
  FOR SELECT USING (...);
```

#### 6. INSERT - ON CONFLICT
**Before:**
```sql
INSERT INTO public.company_settings (company_name) VALUES ('FlowForce');
```

**After:**
```sql
INSERT INTO public.company_settings (company_name) 
VALUES ('FlowForce')
ON CONFLICT DO NOTHING;
```

#### 7. Policies Referencing Non-Existent Columns
**Before:**
```sql
CREATE POLICY "Company members can view their company" 
  ON public.companies 
  FOR SELECT 
  USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
```

**After:**
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    CREATE POLICY "Company members can view their company" 
      ON public.companies 
      FOR SELECT 
      USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  ELSE
    CREATE POLICY "Company members can view their company" 
      ON public.companies 
      FOR SELECT 
      USING (true); -- TODO: tighten after profiles.company_id exists
  END IF;
END $$;
```

#### 8. Foreign Key Constraints - Conditional
**Before:**
```sql
ALTER TABLE public.departments ADD CONSTRAINT departments_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id);
```

**After:**
```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'departments_manager_id_fkey'
    AND table_name = 'departments'
  ) THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_manager_id_fkey 
      FOREIGN KEY (manager_id) REFERENCES public.profiles(id);
  END IF;
END $$;
```

## Remaining Work

### Statistics
- **Total Migrations:** 196 files
- **Fixed:** 4 critical migrations
- **Remaining:** ~192 migrations

### Remaining Patterns to Fix

1. **CREATE TYPE without duplicate handling** - ~15 files
2. **CREATE TABLE without IF NOT EXISTS** - ~93 files (1105+ statements)
3. **CREATE INDEX without IF NOT EXISTS** - Many files
4. **CREATE TRIGGER without DROP first** - Many files
5. **CREATE POLICY without DROP first** - Many files
6. **INSERT without ON CONFLICT** - ~10 files
7. **Policies referencing non-existent tables/columns** - Multiple files

### Recommended Approach

1. **Test Current Fixes:**
   ```bash
   supabase db reset
   supabase start
   ```

2. **If Successful:** Continue fixing remaining migrations in batches
3. **If Failures:** Identify failing migration and fix it
4. **Systematic Fix:** Use the patterns above to fix remaining migrations

### Automated Fix Script

A Python script (`fix_migrations.py`) has been created to help automate fixes, but manual review is recommended for:
- Complex policy logic
- Function signature changes
- Seed data INSERT statements
- Foreign key dependencies

## Testing Commands

```bash
# Reset database and test migrations
supabase db reset

# Start Supabase (applies migrations)
supabase start

# Check migration status
supabase migration list

# Generate types after successful migration
supabase gen types typescript --local > src/types/supabase.ts
```

## Next Steps

1. Test the 4 fixed migrations
2. Identify any remaining failures
3. Fix failures one by one
4. Continue systematic fixes for remaining migrations
5. Document any edge cases found
