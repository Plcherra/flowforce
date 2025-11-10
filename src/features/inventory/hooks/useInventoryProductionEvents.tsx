import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import type { ProductionEvent, ProductionEventInput } from './types';

const productionEventsQueryKey = ['inventory-production-events'];

export function useInventoryProductionEvents() {
  return useQuery<ProductionEvent[]>({
    queryKey: productionEventsQueryKey,
    queryFn: () => InventoryService.listProductionEvents(),
  });
}

export function useCreateProductionEvent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductionEventInput) => InventoryService.createProductionEvent(payload),
    onSuccess: ({ warnings }) => {
      queryClient.invalidateQueries({ queryKey: productionEventsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });

      const description =
        warnings?.length && warnings.length > 0
          ? `Recorded with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`
          : 'Production event recorded successfully';

      toast({
        title: 'Production recorded',
        description,
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to record production event';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      console.error('Create production event error:', error);
    },
  });
}
