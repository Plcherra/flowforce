# Employees Feature

## Hooks
| Hook | Description | Returns |
|------|-------------|---------|
| `useEmployees` | Fetches roster data via repositories, enriches with performance metrics. | `{ employees, loading, error, refetchEmployees, queryKey }`
| `useEmployeesCacheInvalidation` | Invalidates React Query caches for the employee roster. | `() => void`
| `useVendorForm` | (Inventory-adjacent) Provides Zod-validated vendor form state. | `{ form, reset, schema }`

### Usage
```tsx
import { useEmployees } from '@/features/employees/hooks/useEmployees';

const { employees, loading } = useEmployees({ includeInactive: true });
```

### Notes
- Hooks expect the React Query provider and Supabase client context to be available.
- Always prefer `useEmployees` over calling repositories directly inside pages.
