
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { InventoryService } from '@/services/inventory';
import { InventoryItem } from './types';

export function useInventoryItems() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => InventoryService.listItems(),
  });

  return { data, isLoading };
}

export function useCreateInventoryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => 
      InventoryService.createItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Success',
        description: 'Inventory item created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Create inventory item error:', error);
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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => 
      InventoryService.updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Success',
        description: 'Inventory item updated successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Update inventory item error:', error);
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
      console.error('Delete inventory item error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inventory item',
        variant: 'destructive',
      });
    },
  });
}
