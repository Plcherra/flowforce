// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import type { Tables } from '@/integrations/supabase/public-types';
import { InventoryTransaction } from './types';

type InventoryTransactionRow = Tables<'inventory_transactions'>;

export type InventoryTransactionListItem = InventoryTransactionRow & {
  item?: {
    id: string;
    name: string | null;
  } | null;
  performer?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export function useInventoryTransactions() {
  const { profile, loading: profileLoading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const { data, isLoading } = useQuery<InventoryTransactionListItem[]>({
    queryKey: ['inventory-transactions', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          item:item_id (
            id,
            name
          ),
          performer:performed_by (
            first_name,
            last_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as InventoryTransactionListItem[]).map((transaction) => ({
        ...transaction,
        item: transaction.item ?? null,
        performer: transaction.performer ?? null,
      }));
    },
    initialData: [] as InventoryTransactionListItem[],
  });

  return {
    data: data ?? [],
    isLoading: profileLoading || isLoading,
  };
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
