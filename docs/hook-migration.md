# Hook Migration Plan

## Global Utilities (stay in `src/hooks`)
- useAuth
- useIsMobile / use-toast / theme-related hooks
- useSidebarScroll / useRoutePreloader
- Future base hooks: `useTenantContext`, `useChunkedSupabaseQuery`, `usePaginatedList`

## Hooks to move under features
- Employees: `useEmployees`, `useEmployeeEngagement`, `useTeamManagement`
- Inventory: `useInventory`, `useExpenses`, `useInventoryItems`, etc.
- Messages: `useMessages`, `useChannelMessages`, `useMessageOperations`
- Learning: `useLearningCenter`, `useCertifications`
- Company Updates: `useCompanyUpdates`, `useAnnouncements`
- Operations / Scheduling: `useSchedulingConsolidated`, `useScheduleReminders`, `useShiftsForDate`
- Finance: `usePayments`, `useFinancialManagement`
- Tasks/Goals: `useTasks`, `useGoals`, `useGoalDialogs`, `useTaskNotifications`

## Migration steps per feature
1. Create `src/features/<domain>/hooks/` (if missing).
2. Move hook file(s) into feature folder, updating imports.
3. Export hook from `src/features/<domain>/index.ts` (optional) for convenience.
4. Update references throughout codebase.
5. Add or update README (see template below).

## Feature README Template
```
# <Feature> Hooks

| Hook | Description | Returns |
| ---- | ----------- | ------- |
| useFeatureData | Fetches core data via repositories | { data, loading, error }
| useFeatureCacheInvalidation | Invalidates React Query caches | () => void |
| ... | ... | ... |

Usage notes, required providers, example snippet.
```

Update this doc as features migrate.
