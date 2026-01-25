# Phase 7: Best Practices Violations - Implementation Plan
**Date:** January 22, 2026  
**Status:** 🚀 **IN PROGRESS**

## Overview

Phase 7 focuses on fixing best practices violations:
1. Dependency Management - Fix useEffect hooks with missing dependencies
2. Code Duplication - Create shared query hooks/utilities
3. Naming Conventions - Enforce consistent naming via ESLint

---

## Tasks

### 7.1 Dependency Management

#### Issue:
- Some hooks have incorrect dependency arrays
- Multiple `useEffect` hooks with missing dependencies

#### Action Items:
1. Check ESLint configuration for `exhaustive-deps` rule
2. Run ESLint to identify hooks with missing dependencies
3. Fix dependency arrays in critical hooks
4. Ensure all dependencies are included

---

### 7.2 Code Duplication

#### Issue:
- Similar query patterns repeated across files
- No shared query hooks/utilities

#### Action Items:
1. Identify common query patterns:
   - Company-scoped queries (`.eq('company_id', companyId)`)
   - User-scoped queries (`.eq('user_id', userId)`)
   - Date-range queries (`.gte()`, `.lte()`)
2. Create shared query utilities/hooks
3. Refactor existing code to use shared utilities

---

### 7.3 Naming Conventions

#### Issue:
- Some inconsistencies in naming (camelCase vs snake_case)

#### Action Items:
1. Review ESLint configuration
2. Add/enable naming convention rules
3. Identify and document naming inconsistencies
4. Create migration plan for fixing inconsistencies

---

## Implementation Order

1. **Dependency Management** - Fix critical hooks first
2. **Code Duplication** - Create shared utilities
3. **Naming Conventions** - Configure ESLint and document

---

## Success Criteria

- ✅ ESLint `exhaustive-deps` rule enabled and warnings fixed
- ✅ Shared query utilities created
- ✅ Common query patterns refactored to use shared utilities
- ✅ ESLint naming rules configured
- ✅ Naming inconsistencies documented

---

## Files to Create/Modify

### Dependency Management
- Review: All hooks with `useEffect`
- Fix: Critical hooks with missing dependencies

### Code Duplication
- Create: `src/hooks/shared/useCompanyQuery.ts` - Shared company-scoped query hook
- Create: `src/hooks/shared/useUserQuery.ts` - Shared user-scoped query hook
- Refactor: Existing hooks to use shared utilities

### Naming Conventions
- Review: `.eslintrc` configuration
- Document: Naming inconsistencies

---

**Phase 7 Status: 🚀 IN PROGRESS**
