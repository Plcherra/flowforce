
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import { InventoryItem, InventoryItemInsert, InventoryItemUpdate } from './types';
import { logger } from '@/utils/logger';

export function useInventoryItems() {
  const { toast } = useToast();

  const {
    data,
    isLoading,
    error,
  } = useQuery<InventoryItem[], Error>({
    queryKey: ['inventory-items'],
    queryFn: () => InventoryService.listItems(),
  });

  return { data, isLoading, error };
}

export function useCreateInventoryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData: InventoryItemInsert) => 
      InventoryService.createItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Success',
        description: 'Inventory item created successfully',
      });
    },
    onError: (error: Error) => {
      logger.error('Create inventory item error', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: error.message || 'Failed to create inventory item',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInventoryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: InventoryItemUpdate }) => 
      InventoryService.updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Success',
        description: 'Inventory item updated successfully',
      });
    },
    onError: (error: Error) => {
      logger.error('Update inventory item error', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: error.message || 'Failed to update inventory item',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInventoryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => InventoryService.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Success',
        description: 'Inventory item deleted successfully',
      });
    },
    onError: (error: Error) => {
      logger.error('Delete inventory item error', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inventory item',
        variant: 'destructive',
      });
    },
  });
}
