# TypeScript Strict Mode Migration Plan
**Date:** January 22, 2026  
**Status:** Ready to Begin

## Current Configuration

```json
{
  "strict": true,
  "noImplicitAny": false,        // ⚠️ Should be true
  "strictNullChecks": false,     // ⚠️ Should be true
  "noUnusedLocals": false,
  "noUnusedParameters": false
}
```

## Migration Strategy

### Phase 1: Enable `strictNullChecks` ✅ READY TO START

**Impact:** Medium - Will catch null/undefined errors  
**Effort:** 2-3 days  
**Risk:** Low - Can be done incrementally

#### Step 1: Enable strictNullChecks
```json
{
  "strictNullChecks": true
}
```

#### Step 2: Fix Type Errors Incrementally

**Common Patterns to Fix:**

1. **Optional Properties**
```typescript
// Before
const value = data.field; // Error if data might be null

// After
const value = data?.field ?? defaultValue;
```

2. **Array Access**
```typescript
// Before
const item = array[0]; // Error: might be undefined

// After
const item = array[0] ?? null;
// or
const item = array.at(0) ?? null;
```

3. **Function Returns**
```typescript
// Before
function findItem(id: string) {
  return items.find(i => i.id === id); // Returns T | undefined
}

// After
function findItem(id: string): Item | null {
  return items.find(i => i.id === id) ?? null;
}
```

4. **Object Property Access**
```typescript
// Before
const name = user.profile.name; // Error if profile might be null

// After
const name = user.profile?.name ?? 'Unknown';
```

#### Step 3: Priority Order

1. **Critical Paths First** (Day 1)
   - `src/hooks/useAuth.tsx`
   - `src/hooks/useProfile.tsx`
   - `src/repositories/*.ts`
   - `src/components/ui/error-boundary.tsx`

2. **Feature Hooks** (Day 2)
   - `src/hooks/useTasks.tsx`
   - `src/hooks/useForms.tsx`
   - `src/hooks/useEmployees.tsx`
   - `src/hooks/useDashboardData.tsx`

3. **Components** (Day 3)
   - Screen components
   - Feature components
   - UI components

### Phase 2: Enable `noImplicitAny` (After Phase 1)

**Impact:** High - Will catch many type errors  
**Effort:** 1-2 weeks  
**Risk:** Medium - Requires more changes

#### Common Fixes:

1. **Replace `any` with `unknown`**
```typescript
// Before
function handleError(error: any) { ... }

// After
function handleError(error: unknown) {
  if (error instanceof Error) {
    // Now TypeScript knows error is Error
  }
}
```

2. **Add Proper Types**
```typescript
// Before
function processData(data: any) { ... }

// After
function processData(data: FormData | Record<string, unknown>) { ... }
```

3. **Use Type Guards**
```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

### Phase 3: Enable Unused Checks (After Phase 2)

**Impact:** Low - Code cleanup  
**Effort:** 1 day

```json
{
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**Fix Pattern:**
```typescript
// Prefix unused params with _
function handler(_event: Event, data: Data) {
  // Use data, ignore event
}
```

## Implementation Steps

### Step 1: Create Backup Branch
```bash
git checkout -b typescript-strict-nullchecks
```

### Step 2: Enable strictNullChecks
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

### Step 3: Run Type Check
```bash
npm run typecheck
```

### Step 4: Fix Errors Incrementally
- Start with highest priority files
- Fix one file at a time
- Commit after each file
- Test after each batch

### Step 5: Update Tests
- Fix test type errors
- Add null checks where needed

### Step 6: Review & Merge
- Code review
- Run full test suite
- Merge to main

## Expected Error Categories

### Category 1: Simple Null Checks (Easy)
- Add `??` operators
- Add optional chaining `?.`
- Add type assertions where safe

### Category 2: Function Signatures (Medium)
- Update return types
- Add null return types
- Update parameter types

### Category 3: Complex Types (Hard)
- Refactor type definitions
- Add type guards
- Create utility types

## Risk Mitigation

1. **Incremental Approach**: Fix one file at a time
2. **Test Coverage**: Run tests after each change
3. **Type Assertions**: Use sparingly with comments
4. **Feature Flags**: Can enable per-module if needed

## Success Criteria

- [ ] `strictNullChecks: true` enabled
- [ ] Zero type errors in `npm run typecheck`
- [ ] All tests passing
- [ ] No runtime errors introduced
- [ ] Code review approved

## Timeline

- **Week 1**: Enable strictNullChecks, fix critical paths
- **Week 2**: Fix feature hooks and components
- **Week 3**: Fix remaining issues, update tests
- **Week 4**: Review, test, merge

## Notes

- Start with `strictNullChecks` as it's less disruptive
- `noImplicitAny` will require more refactoring
- Keep commits small and focused
- Document any breaking changes
