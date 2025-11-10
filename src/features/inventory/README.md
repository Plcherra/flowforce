# Inventory Feature

## Hooks
| Hook | Description | Returns |
|------|-------------|---------|
| `useInventoryItems` | Loads inventory item catalog (React Query). | `{ data, isLoading, error }`
| `useInventoryLocations` | Fetches storage locations. | `{ data, isLoading, error }`
| `useInventorySuppliers` | Lists active suppliers scoped by company. | `{ data, isLoading, error }`
| `usePurchaseOrders` | Provides PO list + mutations. | React Query object.
| `useCountingTimer` / `useCountingStats` | Helpers for counting sessions. | Various metrics.

_See individual hook files under `src/features/inventory/hooks/` for prop docs._
