# Error Inventory - MVP Launch Readiness

**Date:** January 25, 2026  
**Status:** In Progress  
**Total Errors Found:** TBD

## Error Categories

### 1. Syntax Errors

| File | Line | Error Type | Description | Severity |
|------|------|------------|-------------|----------|
| `src/hooks/use-toast.ts` | 60 | Incomplete return | Early return statement without value (acceptable) | Low |
| `src/components/ui/carousel.tsx` | 71, 101, 109 | Incomplete return | Early return statements (acceptable) | Low |

**Note:** The "incomplete return" statements found are actually valid early returns in TypeScript/JavaScript. No syntax errors detected.

### 2. Type Errors

| File | Error Type | Description | Severity |
|------|------------|-------------|----------|
| Multiple files | TypeScript | Type errors exist but are ignored in build (`ignoreBuildErrors: true`) | Medium |
| React Query hooks | Array type safety | Some hooks may have array type issues (partially fixed) | Low |

**Action Required:** Run full typecheck to get complete list. Many errors are non-blocking for MVP.

### 3. Runtime Errors

| File | Error Type | Description | Severity |
|------|------------|-------------|----------|
| React Query hooks | Unhandled errors | Most hooks don't have `throwOnError: false` | High |
| `src/hooks/useTasks.tsx` | Error handling | Query can throw but error is handled via useEffect | Medium |
| `src/hooks/useExpenses.tsx` | Error handling | Query can throw errors | Medium |
| `src/hooks/useEvents.tsx` | Error handling | Query can throw errors | Medium |
| Multiple hooks | Promise rejections | Async operations may not be wrapped in try-catch | Medium |

### 4. Logic Errors

| File | Error Type | Description | Severity |
|------|------------|-------------|----------|
| Empty states | Data handling | Empty states may cause errors if data is null/undefined | Medium |
| Array operations | Type safety | Some array operations may fail on undefined/null | Low |

### 5. UI Errors

| File | Error Type | Description | Severity |
|------|------------|-------------|----------|
| Error boundaries | Error display | "Something went wrong" message appears | High |
| Empty states | User experience | Empty states may not have proper action buttons | Low |

## Priority Fixes (High Severity)

1. **Add `throwOnError: false` to React Query hooks** - Prevents unhandled promise rejections
2. **Enhance error boundaries** - Better error context and logging
3. **Fix empty state handling** - Ensure no errors from empty data

## Common Patterns Found

### React Query Error Handling
- Only `useForms.tsx` has `throwOnError: false`
- Most hooks rely on default error handling
- Errors may cause unhandled promise rejections

### Error Boundary Coverage
- Error boundaries are implemented
- May need enhancement for better error context

### Empty State Handling
- Empty states exist but may need better error handling
- Some may not handle null/undefined gracefully

## Next Steps

1. Fix high-priority runtime errors (Phase 2)
2. Add error handling to all React Query hooks
3. Enhance error boundaries
4. Test all pages for runtime errors
5. Fix empty state handling
