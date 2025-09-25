
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InventoryTransaction } from './types';

export function useInventoryTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          item:item_id(name),
          performer:performed_by(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[]; // Temporarily disable type checking
    },
  });

  return { data, isLoading };
}

export function useCreateInventoryTransaction() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionData: Omit<InventoryTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Success',
        description: 'Transaction recorded successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to record transaction',
        variant: 'destructive',
      });
      console.error('Create transaction error:', error);
    },
  });
}
