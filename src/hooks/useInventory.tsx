
// Temporary shim re-exporting inventory hooks from their new feature location.
// TODO: migrate imports to '@/features/inventory/hooks/...'
export * from '@/features/inventory/hooks/types';
export * from '@/features/inventory/hooks/useInventoryItems';
export * from '@/features/inventory/hooks/useInventoryUnits';
export * from '@/features/inventory/hooks/useInventoryCategories';
export * from '@/features/inventory/hooks/useInventoryLocations';
export * from '@/features/inventory/hooks/useInventoryTransactions';
export * from '@/features/inventory/hooks/usePurchaseOrders';
export * from '@/features/inventory/hooks/useInventoryCounts';
export * from '@/features/inventory/hooks/useInventorySuppliers';
export * from '@/features/inventory/hooks/useInventoryTransfers';
export * from '@/features/inventory/hooks/useInventoryWaste';
export * from '@/features/inventory/hooks/useCountingTimer';
export * from '@/features/inventory/hooks/useCountingStats';
export * from '@/features/inventory/hooks/useInventoryProductionEvents';
export * from '@/features/inventory/hooks/useInventoryRecipes';
