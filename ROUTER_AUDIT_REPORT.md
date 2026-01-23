# Router Audit Report
**Date:** January 22, 2026  
**Status:** In Progress

## Overview
This document tracks the migration from direct `react-router-dom` imports to using the router adapter (`@/lib/router-adapter`) for Next.js App Router compatibility.

## Current State

### ✅ Already Fixed (Using Router Adapter Explicitly)
1. `src/components/ui/error-boundary.tsx`
2. `src/components/navigation/NavigationGuard.tsx`
3. `src/components/AppShell.tsx`
4. `src/components/navigation/RouteLoadingBoundary.tsx`
5. `src/components/ProtectedRoute.tsx`
6. `src/sections/AppSectionRoutes.tsx`
7. `src/screens/EnhancedScheduling.tsx`
8. `src/components/scheduling/NextGenSchedulingSystem.tsx`

### ⚠️ Path Mapping Status
The `tsconfig.json` has a path mapping that redirects `react-router-dom` to the adapter:
```json
"paths": {
  "react-router-dom": ["./src/lib/router-adapter"]
}
```

**This means:** Files importing from `react-router-dom` are **already** using the adapter, but it's not explicit.

**Recommendation:** Update critical files to use explicit imports for clarity and maintainability.

## Files Still Using `react-router-dom` (70 total)

### High Priority (Navigation & Core Components)
- [ ] `src/components/navigation/AppLayout.tsx` - Uses `Outlet`, `ScrollRestoration`
- [ ] `src/components/navigation/NavigationItem.tsx` - Uses `useNavigate`, `useLocation`
- [ ] `src/components/navigation/DashboardNavigation.tsx` - Navigation component
- [ ] `src/components/sections/DynamicSection.tsx` - Section routing
- [ ] `src/components/sections/UnifiedSectionsManager.tsx` - Section management
- [ ] `src/components/sections/SectionActions.tsx` - Section actions

### Medium Priority (Screen Components)
- [ ] `src/screens/Auth.tsx`
- [ ] `src/screens/Index.tsx`
- [ ] `src/screens/NotFound.tsx`
- [ ] `src/screens/Register.tsx`
- [ ] `src/screens/Admin.tsx`
- [ ] `src/screens/AddSection.tsx`
- [ ] `src/screens/ScheduleLobby.tsx`
- [ ] `src/screens/Resources.tsx`
- [ ] `src/screens/Templates.tsx`
- [ ] `src/screens/TemplateDetail.tsx`
- [ ] `src/screens/CompanyRegistration.tsx`
- [ ] `src/screens/InventoryCountExecution.tsx`
- [ ] `src/screens/Pricing.tsx`
- [ ] `src/screens/LearningCenter/LearningCenterPage.tsx`

### Lower Priority (Feature Components)
- [ ] `src/features/messages/hooks/useMessagesViewModel.ts`
- [ ] `src/features/employees/components/TeamDirectory.tsx`
- [ ] `src/features/inventory/components/InventoryNav.tsx`
- [ ] `src/features/inventory/components/InventoryLayout.tsx`
- [ ] `src/features/inventory/routes/CountDetail.tsx`
- [ ] `src/features/inventory/routes/Counts.tsx`
- [ ] `src/features/inventory/routes/Waste.tsx`
- [ ] `src/features/admin/components/UserManagement.tsx`
- [ ] `src/features/positions/components/PositionManagement.tsx`
- [ ] `src/features/company-updates/hooks/useCompanyUpdateFilters.ts`

### Test Files (Can Wait)
- [ ] `src/screens/__tests__/LearningCenter.test.tsx`
- [ ] Various test files using router mocks

### Scripts & Utilities (Low Priority)
- [ ] `scripts/generate-section.mjs`
- [ ] Various utility files

## Migration Strategy

### Phase 1: Critical Navigation Files ✅ COMPLETED
- ✅ Error boundary
- ✅ NavigationGuard
- ✅ AppShell
- ✅ RouteLoadingBoundary
- ✅ ProtectedRoute
- ✅ EnhancedScheduling

### Phase 2: Core Navigation Components (Next)
Update these files to use explicit router adapter imports:
1. `src/components/navigation/AppLayout.tsx`
2. `src/components/navigation/NavigationItem.tsx`
3. `src/components/navigation/DashboardNavigation.tsx`
4. `src/components/sections/DynamicSection.tsx`

### Phase 3: Screen Components
Update screen components that handle routing:
- Auth screens
- Main entry points
- Error pages

### Phase 4: Feature Components
Update feature components incrementally as needed.

### Phase 5: Cleanup
- Remove React Router dependency if no longer needed
- Update documentation

## Testing Checklist

After each phase:
- [ ] Test navigation between pages
- [ ] Test protected routes
- [ ] Test error boundaries
- [ ] Test search params handling
- [ ] Test route parameters
- [ ] Verify no console errors

## Notes

1. **Path Mapping Works**: The tsconfig path mapping ensures backward compatibility, so files don't break even if they use `react-router-dom`.

2. **Explicit is Better**: Using `@/lib/router-adapter` explicitly makes it clear we're using Next.js routing.

3. **Gradual Migration**: No need to update all 70 files at once. Focus on critical paths first.

4. **Test Coverage**: Ensure tests still work after migration.

## Next Steps

1. ✅ Complete Phase 1 (Critical files)
2. 📋 Update Phase 2 files (Core navigation)
3. 📋 Update Phase 3 files (Screen components)
4. 📋 Document any breaking changes
5. 📋 Consider removing React Router dependency
