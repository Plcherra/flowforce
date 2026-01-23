# Quick Fix for View Error

If you're still getting the `vv.notes` error, it might be because:

1. **The view already exists with SECURITY DEFINER** - Try running this first:

```sql
-- Drop the problematic view first
DROP VIEW IF EXISTS public.calendar_unified_view CASCADE;
```

2. **Then run the full migration** from `20260122010000_fix_security_issues.sql`

3. **Or run this standalone fix**:

```sql
-- Fix calendar_unified_view
DROP VIEW IF EXISTS public.calendar_unified_view CASCADE;

CREATE VIEW public.calendar_unified_view AS
SELECT 
  ce.id,
  ce.title,
  ce.description,
  ce.start_time,
  ce.end_time,
  ce.company_id,
  ce.created_by,
  ce.created_at,
  ce.updated_at,
  'calendar_event'::text as event_type,
  NULL::uuid as vendor_id,
  NULL::text as vendor_name,
  NULL::text as service_type
FROM public.calendar_events ce
UNION ALL
SELECT 
  vv.id,
  vv.vendor_name as title,
  vv.description,  -- ✅ Fixed: was vv.notes
  vv.start_time,
  vv.end_time,
  vv.company_id,
  NULL::uuid as created_by,
  vv.created_at,
  vv.created_at as updated_at,
  'vendor_visit'::text as event_type,
  vv.id as vendor_id,
  vv.vendor_name,
  vv.service_type  -- ✅ Fixed: was vv.vendor_type
FROM public.vendor_visits vv;
```

The key fixes:
- ✅ `vv.notes` → `vv.description`
- ✅ `vv.vendor_type` → `vv.service_type`
- ✅ Removed `vv.created_by` (doesn't exist)
- ✅ Fixed `updated_at` reference
