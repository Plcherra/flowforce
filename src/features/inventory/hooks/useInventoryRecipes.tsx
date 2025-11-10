import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import type { InventoryRecipeLine } from './types';

export function useInventoryRecipes(itemId?: string) {
  return useQuery({
    queryKey: ['inventory-recipes', itemId],
    queryFn: () => InventoryService.listItemRecipes(itemId || ''),
    enabled: !!itemId,
  });
}

export function useUpsertRecipeLine(itemId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (line: Omit<InventoryRecipeLine, 'created_at' | 'updated_at' | 'ingredient' | 'unit' | 'item_id'> & { item_id: string }) =>
      InventoryService.upsertRecipeLine(line),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-recipes', itemId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({ title: 'Recipe updated', description: 'Ingredient saved successfully.' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Failed to update recipe',
        description: message || 'Unable to save ingredient. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteRecipeLine(itemId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (lineId: string) => InventoryService.deleteRecipeLine(lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-recipes', itemId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({ title: 'Ingredient removed', description: 'Recipe ingredient deleted.' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: 'Failed to remove ingredient',
        description: message || 'Unable to delete ingredient. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
