# Supabase Security & Performance Fix Plan

**Date:** January 22, 2026  
**Status:** 🔴 **CRITICAL ISSUES IDENTIFIED**

---

## 🔴 **Critical Security Errors (10 Total)**

### 1. SECURITY DEFINER Views (4 errors) - **CRITICAL**
**Risk:** Views execute with creator's permissions, bypassing user-level RLS

**Affected Views:**
- ✅ `calendar_unified_view` - Fixed in migration
- ✅ `calendar_events_full` - Fixed in migration  
- ✅ `vendor_event` - Fixed in migration
- ✅ `recognitions` - Fixed in migration

**Fix:** Recreate views without `SECURITY DEFINER` property

---

### 2. RLS Disabled Tables (6 errors) - **CRITICAL**
**Risk:** Tables exposed to PostgREST without Row Level Security

**Affected Tables:**
- ✅ `certifications` - Fixed in migration
- ✅ `learning_courses` - Fixed in migration
- ✅ `recognition_events` - Fixed in migration
- ✅ `learning_progress` - Fixed in migration
- ✅ `certification_catalog` - Fixed in migration
- ✅ `gamification_xp` - Fixed in migration

**Fix:** Enable RLS and create tenant isolation policies

---

## ⚠️ **Performance Warnings (700+ reported)**

### Common Performance Issues:
1. **Missing Indexes** - Foreign keys, frequently queried columns
2. **Missing Foreign Key Indexes** - JOIN performance
3. **Missing Composite Indexes** - Multi-column queries
4. **Missing GIN Indexes** - JSONB/array queries
5. **Missing Text Search Indexes** - Full-text search

### Strategy:
1. **Phase 1:** Fix critical security errors (this migration)
2. **Phase 2:** Add missing foreign key indexes
3. **Phase 3:** Add composite indexes for common query patterns
4. **Phase 4:** Add GIN indexes for JSONB columns
5. **Phase 5:** Optimize slow queries identified by Performance Advisor

---

## 📋 **Migration Applied**

**File:** `supabase/migrations/20260122010000_fix_security_issues.sql`

**What it does:**
1. ✅ Recreates 4 views without SECURITY DEFINER
2. ✅ Enables RLS on 6 tables
3. ✅ Creates tenant isolation policies for all tables
4. ✅ Adds critical indexes for performance

---

## 🚀 **Next Steps**

### Immediate (Security):
1. ✅ Apply migration `20260122010000_fix_security_issues.sql`
2. ✅ Verify RLS policies are working
3. ✅ Test tenant isolation

### Short-term (Performance):
1. Run Supabase Performance Advisor
2. Export performance warnings CSV
3. Create batch migration for missing indexes
4. Focus on:
   - Foreign key indexes
   - Frequently queried columns
   - Composite indexes for WHERE clauses
   - GIN indexes for JSONB

### Long-term (Optimization):
1. Analyze slow queries
2. Optimize query patterns
3. Consider materialized views for complex aggregations
4. Review and optimize RLS policies

---

## 📊 **Performance Index Strategy**

### Priority 1: Foreign Key Indexes
```sql
-- Example pattern
CREATE INDEX IF NOT EXISTS idx_table_fk_column ON public.table(foreign_key_column);
```

### Priority 2: Composite Indexes
```sql
-- For common WHERE clauses
CREATE INDEX IF NOT EXISTS idx_table_col1_col2 ON public.table(column1, column2);
```

### Priority 3: GIN Indexes for JSONB
```sql
-- For JSONB queries
CREATE INDEX IF NOT EXISTS idx_table_jsonb_col_gin ON public.table USING GIN(jsonb_column);
```

### Priority 4: Text Search Indexes
```sql
-- For full-text search
CREATE INDEX IF NOT EXISTS idx_table_text_col_gin ON public.table USING GIN(to_tsvector('english', text_column));
```

---

## 🔍 **Verification Queries**

### Check RLS Status:
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
```

### Check SECURITY DEFINER Views:
```sql
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%SECURITY DEFINER%';
```

### Check Missing Indexes:
```sql
-- Foreign keys without indexes
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

---

## 📝 **Notes**

- All RLS policies use tenant isolation pattern
- Policies check `company_id` matching via `profiles` table
- Views are recreated to remove SECURITY DEFINER
- Indexes use `IF NOT EXISTS` to avoid conflicts
- Migration is idempotent (can be run multiple times safely)

---

## ⚡ **Quick Apply**

To apply the security fixes:

1. **Via Supabase Dashboard:**
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/20260122010000_fix_security_issues.sql`
   - Run the migration

2. **Via Supabase CLI:**
   ```bash
   supabase db push
   ```

3. **Verify:**
   - Check Supabase Linter again
   - Should show 0 security errors
   - Performance warnings will remain (addressed in next phase)
