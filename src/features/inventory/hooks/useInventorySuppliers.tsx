import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InventorySupplier } from './types';

export function useInventorySuppliers(companyId?: string | null) {
  const query = useQuery({
    queryKey: ['inventory-suppliers', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from('inv_suppliers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as InventorySupplier[];
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}

export function useCreateSupplier() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierData: { name: string; contact_name?: string; email?: string; phone?: string; address?: string; payment_terms?: string; notes?: string }) => {
      // First get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!profile?.company_id) {
        throw new Error('No company associated with user');
      }

      const { data, error } = await supabase
        .from('inv_suppliers')
        .insert({
          ...supplierData,
          company_id: profile.company_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message || 'Failed to create supplier');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
      toast({
        title: 'Success',
        description: 'Supplier created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Create supplier error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create supplier',
        variant: 'destructive',
      });
    },
  });
}
