# Performance Policy Consolidation Notes

## Migration: `20260122040000_consolidate_multiple_permissive_policies.sql`

This migration consolidates 571 `multiple_permissive_policies` warnings by merging overlapping permissive RLS policies.

## How PostgreSQL RLS Policies Work

When multiple **permissive** policies exist for the same table/action:
- They are evaluated with **OR** logic
- If ANY policy allows access, access is granted
- This is the same behavior we preserve when consolidating

## Consolidation Strategy

For each table/action combination with multiple permissive policies:

1. **Collect all USING clauses** from all policies
2. **Collect all WITH CHECK clauses** from all policies  
3. **Combine USING clauses** with OR: `(clause1) OR (clause2) OR ...`
4. **Combine WITH CHECK clauses** with OR: `(clause1) OR (clause2) OR ...`
5. **Drop old policies** and create a single consolidated policy

## Security Preservation

The consolidation maintains exact security semantics because:
- PostgreSQL already evaluates multiple permissive policies with OR
- Our consolidated policy uses the same OR logic
- No access rules are changed, only performance is improved

## Example

**Before** (2 policies evaluated):
```sql
CREATE POLICY "Users can view their own" ON table FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Managers can view all" ON table FOR SELECT 
USING (is_manager(auth.uid()));
```

**After** (1 policy evaluated):
```sql
CREATE POLICY "consolidated_select_table" ON table FOR SELECT 
USING ((user_id = (select auth.uid())) OR (is_manager((select auth.uid()))));
```

## Edge Cases Handled

1. **Policies with only USING**: Only USING clause is consolidated
2. **Policies with only WITH CHECK**: Only WITH CHECK clause is consolidated
3. **Policies with both**: Both clauses are consolidated separately
4. **Duplicate clauses**: Removed via DISTINCT
5. **Empty/NULL clauses**: Filtered out

## Testing After Migration

After applying this migration:

1. **Verify Security**: Test that users can still access data they should have access to
2. **Verify Restrictions**: Test that users cannot access data they shouldn't have access to
3. **Check Performance**: Monitor query performance improvements
4. **Re-run Linter**: Confirm warnings are resolved

## Rollback Strategy

If issues arise, you can:
1. Check the migration logs for which policies were consolidated
2. Restore individual policies from backup if needed
3. The consolidated policy names follow pattern: `consolidated_{action}_{table}`

## Notes

- Policy names are auto-generated and may be truncated if > 63 characters
- The migration processes all tables in the `public` schema
- Only permissive policies are consolidated (restrictive policies are left as-is)
- Policies are consolidated per action type (SELECT, INSERT, UPDATE, DELETE, ALL)
