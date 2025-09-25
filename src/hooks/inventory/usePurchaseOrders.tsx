import { useQuery } from '@tanstack/react-query';
import { InventoryService } from '@/services/inventory';

export function usePurchaseOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => InventoryService.listPurchases(),
  });

  return { data, isLoading };
}