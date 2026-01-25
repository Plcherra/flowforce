# Phase 3: Code Quality Issues - Fixes Applied
**Date:** January 22, 2026  
**Status:** ✅ In Progress

## Overview
Addressing code quality issues identified in `PROJECT_REVIEW_REPORT.md` section 3.

---

## ✅ Fixes Applied

### 3.1 Type Safety (`any` Usage) ✅ **HIGH PRIORITY FIXED**

#### Issue: 723 instances of `any` type across 247 files

**High Priority Files Fixed:**

1. **`src/utils/errorHandler.ts`** ✅
   - **Before:** `handleError(error: any, ...)` and `showErrorToast(error: any, ...)`
   - **After:** `handleError(error: unknown, ...)` with type guards
   - **Added:** Type guard functions (`isErrorWithMessage`, `isErrorWithCode`, `extractErrorMessage`, `extractErrorCode`)
   - **Status:** ✅ Fixed - Proper error handling with type safety

2. **`src/repositories/tasksRepository.ts`** ✅
   - **Before:** `attachments: z.any().nullable()`, `links: z.any()`
   - **After:** `attachments: z.unknown().nullable()`, `links: z.unknown()`
   - **Status:** ✅ Fixed - Uses `unknown` instead of `any`

3. **`src/repositories/taskNotificationsRepository.ts`** ✅
   - **Before:** `metadata: z.any().nullable()`
   - **After:** `metadata: z.unknown().nullable()`
   - **Status:** ✅ Fixed

4. **`src/types/common.ts`** ✅
   - **Before:** `submission_data: any`
   - **After:** `submission_data: unknown`
   - **Status:** ✅ Fixed

5. **`app/api/run-detectors/route.ts`** ✅
   - **Before:** `(org as any).id`
   - **After:** Proper `OrganizationRow` interface
   - **Status:** ✅ Fixed (from Phase 2)

**Result:** High-priority `any` types replaced with `unknown` and proper type guards.

**Remaining:** ~720 instances across other files (can be addressed incrementally)

---

### 3.2 Console Logging ✅ **HIGH PRIORITY FILES FIXED**

#### Issue: 503 instances of `console.log/error/warn` across 198 files

**High Priority Files Fixed:**

1. **`src/hooks/useDashboardData.tsx`** ✅
   - **Replaced:** 4 console statements
   - **With:** Structured logging using `logger` from `@/utils/logger`
   - **Added:** Proper tags (`security`, `tenant-isolation`, `data-integrity`, `dashboard`, `data-fetch`)
   - **Status:** ✅ Fixed

2. **`src/hooks/useForms.tsx`** ✅
   - **Replaced:** 11 console statements
   - **With:** Structured logging using `logger`
   - **Added:** Proper tags (`security`, `tenant-isolation`, `forms`, `data-fetch`, `create`, `update`, `delete`, `save`, `submit`, `submissions`, `data-fallback`)
   - **Status:** ✅ Fixed

**Result:** Critical hooks now use structured logging.

**Remaining:** ~488 instances across other files (can be addressed incrementally)

---

### 3.3 TODO/FIXME Comments 📋 **TRACKING SYSTEM CREATED**

#### Issue: 94 files with TODO/FIXME comments

**Solution:** Created tracking system (see `TODO_TRACKING.md`)

**Status:** 📋 Infrastructure ready, prioritization pending

---

## 📊 Code Quality Improvements Summary

### Type Safety
- ✅ High-priority `any` types replaced with `unknown`
- ✅ Type guards added for error handling
- ✅ Proper interfaces for API responses
- ⚠️ ~720 `any` instances remaining (incremental work)

### Logging
- ✅ Critical hooks use structured logging
- ✅ Proper log levels and tags
- ✅ Security warnings properly logged
- ⚠️ ~488 console statements remaining (incremental work)

### Documentation
- ✅ TODO tracking system created
- 📋 Prioritization pending

---

## 📝 Files Modified

1. `src/utils/errorHandler.ts` - Replaced `any` with `unknown`, added type guards
2. `src/repositories/tasksRepository.ts` - Replaced `z.any()` with `z.unknown()`
3. `src/repositories/taskNotificationsRepository.ts` - Replaced `z.any()` with `z.unknown()`
4. `src/types/common.ts` - Replaced `any` with `unknown`
5. `src/hooks/useDashboardData.tsx` - Replaced console statements with logger
6. `src/hooks/useForms.tsx` - Replaced console statements with logger

---

## 🎯 Next Steps (Optional)

### High Priority
1. **Fix More `any` Types** (2-3 hours)
   - Repository files
   - Component props
   - Hook return types

2. **Replace More Console Statements** (3-4 hours)
   - Feature hooks
   - Component files
   - Service files

### Medium Priority
3. **Prioritize TODOs** (1-2 hours)
   - Review all TODO/FIXME comments
   - Categorize by priority
   - Create tickets for critical ones

---

## ✅ Phase 3 Status: **HIGH PRIORITY COMPLETE**

**Critical code quality issues addressed:**
- ✅ Error handler type safety improved
- ✅ Critical hooks use structured logging
- ✅ Repository types improved
- ✅ TODO tracking system ready

**The codebase now has better type safety and logging!** 🎉

---

## 📈 Impact

### Before
- `any` types bypassing type safety
- Console statements scattered everywhere
- No structured logging
- TODOs untracked

### After
- Type-safe error handling
- Structured logging in critical paths
- Better debugging capabilities
- TODO tracking infrastructure

---

**Phase 3 High Priority Complete!** ✅
