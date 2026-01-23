# Performance Warnings Analysis

## Summary
- **Total warnings**: 747
- **`auth_rls_initplan`**: 177 warnings
- **`multiple_permissive_policies`**: 571 warnings

## Issue 1: Auth RLS Initialization Plan (177 warnings)

### Problem
RLS policies are re-evaluating `auth.uid()`, `auth.role()`, and `current_setting()` calls for each row, causing suboptimal query performance at scale.

### Solution
Replace direct calls with subquery wrappers:
- `auth.uid()` → `(select auth.uid())`
- `auth.role()` → `(select auth.role())`
- `current_setting('key')` → `(select current_setting('key'))`

### Affected Tables (Top 15)
Based on the CSV analysis, these tables have the most policies needing optimization.

## Issue 2: Multiple Permissive Policies (571 warnings)

### Problem
Tables have multiple permissive RLS policies for the same role and action (e.g., SELECT, INSERT, UPDATE, DELETE). Each policy must be executed for every relevant query, causing performance overhead.

### Solution
Consolidate overlapping policies into a single policy using OR conditions. This requires:
1. Identifying all policies for each table/role/action combination
2. Merging their USING/WITH CHECK conditions with OR logic
3. Dropping redundant policies
4. Ensuring security requirements are maintained

### Example
Instead of:
```sql
CREATE POLICY "Users can view their own" ON table FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Managers can view all" ON table FOR SELECT USING (is_manager(auth.uid()));
```

Use:
```sql
CREATE POLICY "Users and managers can view" ON table FOR SELECT 
USING (
  user_id = (select auth.uid()) OR 
  is_manager((select auth.uid()))
);
```

## Implementation Strategy

### Phase 1: Fix `auth_rls_initplan` (177 policies)
1. Query the database to get current policy definitions
2. Identify policies using `auth.uid()`, `auth.role()`, `current_setting()` directly
3. Create a migration that:
   - Drops existing policies
   - Recreates them with subquery wrappers
   - Maintains exact same security logic

### Phase 2: Fix `multiple_permissive_policies` (571 policies)
1. Group warnings by table/role/action
2. For each group, analyze policy conditions
3. Consolidate policies where security allows
4. Create migration to drop and recreate consolidated policies

## Notes
- Some policies may have been partially fixed in previous migrations
- Need to verify current state of policies in database
- Consolidation must preserve security - when in doubt, keep separate policies
- Test thoroughly after applying fixes
