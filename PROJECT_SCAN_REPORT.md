# FlowForce Project Scan Report
**Date:** January 22, 2026  
**Status:** ⚠️ CRITICAL ISSUES FOUND

## Executive Summary

This comprehensive scan identified **multiple critical security vulnerabilities**, **data integrity issues**, and **broken logic** throughout the codebase. While there are no linter errors, there are significant runtime and security concerns that need immediate attention.

---

## 🔴 CRITICAL SECURITY VULNERABILITIES

### 1. **Unrestricted AI Insights Edge Function** (CRITICAL)
**Location:** `supabase/functions/ai-insights/index.ts`

**Issue:**
- Function allows `*` CORS (any origin can call it)
- No authentication/authorization checks
- Uses service-role key to bypass RLS
- Returns raw tenant data without filtering

**Risk:** Any attacker can exfiltrate ALL tenant data (schedules, tasks, expenses, forms, submissions)

**Fix Required:**
- Require Supabase JWT in Authorization header
- Validate user session with `auth.getUser()`
- Scope all queries by caller's `company_id`
- Restrict CORS to trusted origins only
- Use user-scoped client instead of service-role where possible

**Reference:** `dev/codex_security_compliance_tasks.md:4-7`

---

### 2. **AI Scheduling Assistant Unauthenticated Access** (CRITICAL)
**Location:** `supabase/functions/ai-scheduling-assistant/index.ts`

**Issue:**
- `*` CORS allows any origin
- No session validation
- Uses service-role key
- Accepts arbitrary `scheduleId`/`companyId` inputs

**Risk:** Attackers can dump staff availability, performance records, assignments, and compliance rules for any tenant

**Fix Required:**
- Enforce JWT validation
- Validate inputs against requester's company membership
- Use RLS-aware queries
- Remove public CORS or front behind authenticated proxy

**Reference:** `dev/codex_security_compliance_tasks.md:9-12`

---

### 3. **Cross-Tenant Data Leakage - Tasks** (CRITICAL)
**Location:** `src/hooks/useTasks.tsx`

**Status:** ⚠️ **PARTIALLY FIXED** - Uses `fetchTasksByCompany()` but needs verification

**Issue:**
- Task queries may pull records from all tenants if company filtering is incomplete
- RLS policies may not be sufficient

**Fix Required:**
- Verify all task queries include `.eq('company_id', companyId)`
- Add regression tests confirming other-company tasks are filtered
- Ensure RLS policies enforce tenant isolation

**Reference:** `refactor_tasks/R02_UseTasks.md`

---

### 4. **Cross-Tenant Data Leakage - Analytics** (HIGH)
**Location:** `src/services/analytics/businessAnalyticsService.ts`

**Issue:**
- Analytics aggregates may not filter by tenant
- Tasks, inventory_transactions, and expenses queries need `company_id` filters

**Fix Required:**
- Add `company_id` filters to all analytics queries
- Ensure user IDs cannot leak cross-tenant data

**Reference:** `dev/codex_quality_assurance_tasks.md:20`

---

### 5. **Cross-Tenant Data Leakage - Messaging** (HIGH)
**Locations:**
- `src/pages/MessagesPage.tsx:102`
- `src/components/messages/MessageSearch.tsx:80-115`
- `src/components/messages/UserSelector.tsx:71-88`
- `src/components/messages/ChannelMembers.tsx:80-121`
- `src/components/messages/ChannelSettings.tsx:70-114`

**Issue:**
- Messaging queries not scoped by company
- Profiles roster bootstrap lacks company filter
- User lookup may return cross-tenant users

**Fix Required:**
- Add `.eq('company_id', activeCompanyId)` to all messaging queries
- Ensure company context is available and plumbed through hooks

**Reference:** `dev/codex_quality_assurance_tasks.md:14-19`

---

## 🟠 HIGH PRIORITY BUGS

### 6. **clearWeek Cross-Tenant Deletion** (CRITICAL - FIXED)
**Location:** `src/contexts/SchedulingContext.tsx:479-523`

**Status:** ✅ **FIXED** - Now includes `.eq('company_id', companyId!)` filters

**Previous Issue:**
- Deleted schedules and vendor events without company scoping
- Could purge data for all tenants

**Current Status:** Fixed in lines 491 and 501

---

### 7. **Timezone Date Parsing Bug** (HIGH)
**Location:** `src/components/scheduling/NextGenSchedulingSystem.tsx`

**Status:** ✅ **FIXED** - Uses `parseISO(day)` instead of `new Date(\`${day}T00:00:00\`)`

**Previous Issue:**
- Manual date string construction shifts to prior day in negative timezones
- Daily hour summaries display off-by-one dates

**Current Status:** Fixed - uses `formatDailyHoursLabel` with `parseISO`

---

### 8. **Bulk Shift Creation Performance** (MEDIUM)
**Location:** `src/contexts/SchedulingContext.tsx:bulkCreateShifts`

**Issue:**
- Loops through `upsertShift`, triggering `refetchAll` after every insert
- Results in redundant round-trips and sluggish week copy

**Fix Required:**
- Use single bulk insert with normalized payloads
- Only call `refetchAll` once after all inserts
- Update `copyWeek` to use bulk path directly

**Reference:** `dev/codex_refactor_tasks.md:R04`

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **useForms Hook Warnings** (MEDIUM)
**Location:** `src/hooks/useForms.tsx`

**Issue:**
- `fetchForms` defined inline without memoization
- Generates ESLint hook warnings
- Risk of stale closures

**Fix Required:**
- Wrap fetcher in `useCallback`
- Include in effect dependencies
- Align with React Query for caching

**Reference:** `dev/codex_refactor_tasks.md:R05`

---

### 10. **Vendor Event View Schema Mismatch** (MEDIUM)
**Location:** Multiple files using `vendor_event`

**Issue:**
- `vendor_event` is now a view based on `vendor_visits` table
- View structure differs from expected schema:
  - View has: `vendor_name`, `service_type`, `start_time`, `end_time`
  - Code expects: `vendor_type`, `event_date`, `location_id`, `shift_id`, `notes`
- Views don't support inserts/updates

**Status:** ⚠️ **PARTIALLY FIXED** - Queries updated to use `start_time` instead of `event_date`

**Remaining Issues:**
- Insert/update operations may fail (views are read-only)
- Schema validation may fail due to field name mismatches
- Need to update code to work with `vendor_visits` table directly for mutations

**Files Affected:**
- `src/repositories/schedulingRepository.ts`
- `src/contexts/SchedulingContext.tsx`
- `src/server/vendorEvents.ts`
- `src/hooks/scheduling/useSchedulingConsolidated.ts`

---

### 11. **Task Status Enum Mismatch** (MEDIUM - PARTIALLY FIXED)
**Location:** Multiple files

**Issue:**
- Database enum: `'todo', 'in_progress', 'review', 'completed', 'cancelled'`
- Code uses: `'done'` (not in enum)
- Some queries still reference `'done'`

**Status:** ✅ **MOSTLY FIXED** - Queries updated to use `.in('status', [...])` with valid values

**Remaining Issues:**
- Some code still references `'done'` status
- Need to ensure all status updates use `'completed'` instead

**Files Fixed:**
- `src/repositories/taskNotificationsRepository.ts` ✅
- `app/api/_server/codexEngine/taskRunner.ts` ✅

**Files Still Using 'done':**
- `src/constants/taskStatus.ts` - Type definition includes 'done'
- `src/screens/Tasks.tsx` - UI logic references 'done'
- `src/hooks/useTasks.tsx` - Status aliases map 'completed' to 'done'

---

### 12. **Missing Error Handling** (MEDIUM)
**Locations:** Throughout codebase

**Issues Found:**
- 700+ `console.error`/`console.warn` statements (many legitimate, but some indicate missing user-facing error handling)
- Empty catch blocks: `catch (error) { }`
- Errors logged but not shown to users
- Missing error boundaries in some components

**Examples:**
- `src/components/scheduling/WeekTemplateDialog.tsx:79` - Empty catch block
- Many error handlers only log without user feedback

**Fix Required:**
- Add user-facing error messages via toast/alert
- Implement error boundaries for critical sections
- Replace empty catch blocks with proper error handling

---

## 🟢 LOW PRIORITY / CODE QUALITY

### 13. **Type Safety Issues** (LOW)
**Locations:** Throughout codebase

**Issues:**
- 2000+ uses of `any` type
- `@ts-ignore` comments (found in search)
- Type assertions without validation

**Examples:**
- `src/repositories/taskNotificationsRepository.ts:17` - `z.any().nullable()`
- `src/components/analytics/FormAnalytics.tsx` - Multiple `any` types
- `app/api/_server/supabaseAdmin.ts:29` - `new Proxy({} as any, ...)`

**Impact:** Reduced type safety, potential runtime errors

---

### 14. **Mock Data in Production Code** (LOW)
**Locations:**
- `src/pages/MessagesPage.tsx` - `MOCK_MESSAGES`
- `src/pages/Performance.tsx` - `mockPerformanceData`
- `src/pages/Reports.tsx` - Mock data arrays
- `src/components/updates/steps/RecipientsStep.tsx` - `MOCK_USERS`

**Status:** Documented in `docs/data-integrity-audit-report.md`

**Fix Required:** Connect to real data sources or mark as demo/test components

---

### 15. **Incomplete Features** (LOW)
**Locations:**
- `src/components/scheduling/WeekTemplateDialog.tsx` - Template creation not implemented (TODO comment)
- Various features marked as "not yet implemented"

---

## 📊 Summary Statistics

- **Critical Security Issues:** 5
- **High Priority Bugs:** 3 (1 fixed, 2 remaining)
- **Medium Priority Issues:** 4
- **Low Priority Issues:** 3
- **Total Issues Found:** 15+

---

## 🎯 Recommended Action Plan

### Immediate (This Week):
1. ✅ Fix AI Insights edge function authentication
2. ✅ Fix AI Scheduling Assistant authentication  
3. ✅ Verify task queries have company filtering
4. ✅ Add company filters to analytics queries
5. ✅ Add company filters to messaging queries

### Short Term (This Month):
6. ✅ Optimize bulk shift creation
7. ✅ Fix useForms hook warnings
8. ✅ Resolve vendor_event view schema issues
9. ✅ Complete task status enum migration
10. ✅ Add error boundaries and user-facing error messages

### Long Term (Next Quarter):
11. ✅ Reduce `any` type usage
12. ✅ Replace mock data with real implementations
13. ✅ Complete incomplete features
14. ✅ Add comprehensive test coverage

---

## 📝 Notes

- **Linter Status:** ✅ No linter errors found
- **Build Status:** ✅ Project compiles successfully
- **TypeScript:** ⚠️ Many `any` types reduce type safety
- **Test Coverage:** ⚠️ Limited test coverage (needs improvement)

---

## 🔗 References

- Security Tasks: `dev/codex_security_compliance_tasks.md`
- Refactor Tasks: `dev/codex_refactor_tasks.md`
- Quality Assurance: `dev/codex_quality_assurance_tasks.md`
- Data Integrity Audit: `docs/data-integrity-audit-report.md`

---

**Report Generated:** January 22, 2026  
**Next Review:** Recommended in 2 weeks after critical fixes are applied
