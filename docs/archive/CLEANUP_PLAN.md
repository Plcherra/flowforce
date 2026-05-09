# FlowForce Hard Cleanup Plan

## Overview
This document outlines a comprehensive cleanup plan to remove temporary files, fix errors, and organize the codebase.

## Phase 1: Critical Issues ⚠️

### TypeScript Memory Issue
**CRITICAL:** TypeScript compiler is running out of memory (heap limit reached). This indicates:
- Project is too large for current memory allocation
- May have circular dependencies or excessive type complexity
- Need to increase memory or reduce project size

**Immediate Actions:**
- [x] Fixed duplicate import in `UserPermissionsTab.tsx`
- [ ] Clean up files to reduce project size (may help with memory)
- [ ] Try typecheck with increased memory: `NODE_OPTIONS='--max-old-space-size=8192' npm run typecheck`
- [ ] If still fails, investigate circular dependencies and type complexity

### Immediate Error Fixes ✅
- [x] Fixed duplicate import in `UserPermissionsTab.tsx`
- [ ] Run typecheck with increased memory after cleanup
- [ ] Fix any runtime errors discovered during testing

## Phase 2: Root Directory Cleanup

### Files to DELETE (Temporary Planning/Documentation)
These are temporary planning files that should be archived or removed:

**Phase/Status Files:**
- `PHASE_1_FINAL_STATUS.md`
- `PHASE_2_FINAL_STATUS.md`
- `PHASE_2_COMPLETION_SUMMARY.md`
- `PHASE_2_SECURITY_FIXES.md`
- `PHASE_3_COMPLETE.md`
- `PHASE_3_COMPLETION_SUMMARY.md`
- `PHASE_3_COMPLETION_REVIEW.md`
- `PHASE_3_FINAL_STATUS.md`
- `PHASE_3_CODE_QUALITY_FIXES.md`
- `PHASE_4_COMPLETE.md`
- `PHASE_4_REMAINING_COMPLETE.md`
- `PHASE_4_REMAINING_TASKS.md`
- `PHASE_4_PROGRESS.md`
- `PHASE_5_COMPLETE.md`
- `PHASE_5_PLAN.md`
- `PHASE_6_COMPLETE.md`
- `PHASE_6_REVIEW.md`
- `PHASE_6_REVIEW_COMPLETE.md`
- `PHASE_6_PLAN.md`
- `PHASE_7_COMPLETE.md`
- `PHASE_7_PLAN.md`
- `PHASE_8_VERIFICATION_REPORT.md`
- `PHASE_8_PLAN.md`
- `PHASE_9_COMPLETE.md`
- `PHASE_9_PLAN.md`
- `PHASE_10_COMPLETE.md`
- `PHASE_10_PLAN.md`

**Fix/Summary Files:**
- `ARCHITECTURE_FIXES_SUMMARY.md`
- `ARCHITECTURE_IMPROVEMENTS.md`
- `ARCHITECTURE_IMPROVEMENTS_COMPLETE.md`
- `COMPLETE_FIX.md`
- `CONSOLE_LOGGER_FIX.md`
- `CRITICAL_FIXES_SUMMARY.md`
- `FINAL_FIX_SUMMARY.md`
- `FINAL_PERFORMANCE_FIX.md`
- `FINAL_PROJECT_STATUS.md`
- `HOOK_VIOLATIONS_FIX.md`
- `MIGRATION_FIXES.md`
- `NEXTJS_HANG_FIX.md`
- `PERFORMANCE_CONSOLIDATION_NOTES.md`
- `PERFORMANCE_FIXES_SUMMARY.md`
- `PERFORMANCE_WARNINGS_ANALYSIS.md`
- `QUICK_DEBUG.md`
- `QUICK_FIX_FOR_VIEW_ERROR.md`
- `REMAINING_ISSUES_FIXED.md`
- `ROUTER_AUDIT_REPORT.md`
- `SUPABASE_SECURITY_FIX_PLAN.md`
- `TYPESCRIPT_STRICT_MIGRATION.md`
- `VERCEL_DEPLOYMENT_FIX.md`
- `VITE_TO_NEXTJS_FIX.md`

**Debug/Setup Files:**
- `APPLY_MIGRATION_INSTRUCTIONS.md`
- `APPLY_PERFORMANCE_FIXES.md`
- `DEBUG_STARTUP.md`
- `DEBUG_STEPS.md`
- `ENV_VARS_SETUP.md`
- `FIX_NOT_COMPILING.md`
- `ICLOUD_SYNC_FIX.md`
- `QUICK_START.md`
- `SPEED_UP_DEV.md`

**Report/Scan Files:**
- `CODE_QUALITY_PROGRESS.md`
- `COMMUNICATION_SECTION_EVALUATION.md`
- `PROJECT_REVIEW_REPORT.md`
- `PROJECT_SCAN_REPORT.md`
- `SCAN_RESULTS.md`
- `TODO_TRACKING.md`

**Other Temporary Files:**
- `GIT_CLEANUP_SUMMARY.md`
- `project-cleanup-report.md`
- `project-cleanup-phase2.md`
- `file-test.ts` (if unused)

### Files to KEEP (Essential Documentation)
- `README.md` - Main project documentation
- `docs/` directory - Keep all documentation in docs folder
- `tasks/` directory - Task definitions (may need review)
- `refactor_tasks/` directory - Refactoring tasks (may need review)

## Phase 3: Dev Directory Cleanup

### Files to DELETE or ARCHIVE
All files in `dev/` appear to be temporary planning documents:
- `codex_ai_predictive_tasks.md`
- `codex_branding_whitelabel_tasks.md`
- `codex_documentation_tasks.md`
- `codex_financial_automation_tasks.md`
- `codex_launch_billing_tasks.md`
- `codex_onboarding_enhancement_tasks.md`
- `codex_performance_scaling_tasks.md`
- `codex_quality_assurance_tasks.md`
- `codex_refactor_tasks.md`
- `codex_security_compliance_tasks.md`
- `codex_tasks_distribution.md`
- `codex_testing_ci_cd_tasks.md`
- `SECOND_MVP_SCAN_AND_FIXES.md`

**Action:** Move to `docs/archive/dev-planning/` or delete if no longer needed

## Phase 4: Reports Directory Cleanup

### Files to REVIEW and potentially DELETE
- `reports/cleanup-phase3-summary.md` - Temporary cleanup report
- `reports/cleanup-status/` - JSON files from cleanup process
- `reports/refactor-backlog.md` - May be outdated
- `reports/module-map/` - Keep if still useful for documentation

**Action:** Archive old cleanup reports, keep module maps if still relevant

## Phase 5: Scripts and Config Cleanup

### Files to REVIEW
- `debug-dev-server.sh` - May be temporary
- `diagnose-nextjs-hang.sh` - May be temporary
- `run-debug.sh` - May be temporary
- `test-simple-next.mjs` - May be temporary
- `tmp/` directory - Should be empty or deleted

## Phase 6: Source Code Cleanup

### Refactor Markdown Files
All `.refactor.md` files in `src/` should be reviewed:
- If refactoring is complete → DELETE
- If refactoring is pending → Move to `docs/refactoring/` or `refactor_tasks/`

### Unused Files
- Check for unused components, hooks, utilities
- Remove dead code
- Consolidate duplicate functionality

## Phase 7: TypeScript Error Resolution ✅ IN PROGRESS

### Current Status
- ✅ Memory issue resolved with `NODE_OPTIONS='--max-old-space-size=8192'`
- ✅ TypeScript can now run successfully
- ⚠️ Multiple TypeScript errors detected (need full count)

### Error Categories Found:
1. **Missing Module Errors:**
   - `@/lib/cron/verifyCron` - Missing module (2 files)

2. **Type Property Errors:**
   - `LogMeta` type issues - `companyId` and `timestamp` properties don't exist
   - `DocumentWithRelations` type issues - Missing properties (meta, doc_date, created_at, processing_state, etc.)

3. **React Query Type Errors:**
   - Array method errors on `NoInfer<TQueryFnData>` types
   - Need proper type guards/assertions for query data

### Steps
1. ✅ Run `npm run typecheck` with increased memory
2. ⏳ Categorize errors by type
3. ⏳ Fix missing modules first
4. ⏳ Fix type definition issues
5. ⏳ Fix React Query type assertions
6. ⏳ Verify fixes don't break runtime behavior

## Phase 8: Build Verification

### Steps
1. Clean build: `rm -rf .next node_modules/.cache`
2. Install dependencies: `npm install`
3. Type check: `npm run typecheck`
4. Lint: `npm run lint`
5. Build: `npm run build`
6. Test dev server: `npm run dev` (verify it starts)

## Phase 9: Git Cleanup

### Steps
1. Review untracked files: `git status`
2. Add essential files to `.gitignore` if needed
3. Commit cleanup changes
4. Consider squashing old commits if needed

## Execution Order

1. ✅ Fix immediate TypeScript errors
2. Create `docs/archive/` directory for historical files
3. Move or delete temporary planning files
4. Clean up dev/ and reports/ directories
5. Remove unused scripts
6. Fix all TypeScript errors
7. Verify build works
8. Commit cleanup

## Notes

- **Backup First:** Consider creating a backup branch before major cleanup
- **Incremental:** Clean up in phases, test after each phase
- **Documentation:** Keep only essential, up-to-date documentation
- **Archive vs Delete:** When in doubt, archive to `docs/archive/` rather than delete
