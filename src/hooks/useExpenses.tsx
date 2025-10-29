
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

export interface Expense {
  id: string;
  employee_id?: string;
  company_id?: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  payment_method?: string;
  receipt_url?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    company_id?: string | null;
  };
  approver?: {
    first_name: string;
    last_name: string;
  };
}

type ExpenseInput = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at' | 'employee' | 'approver' | 'company_id'
>;

export function useExpenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const query = useQuery({
    queryKey: ['expenses', companyId],
    enabled: Boolean(companyId) && !profileLoading,
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company context is required to fetch expenses.');
      }

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          employee:profiles!employee_id(company_id, first_name, last_name),
          approver:profiles!approved_by(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (expense: ExpenseInput) => {
      if (!companyId) {
        throw new Error('Company context is required to create an expense.');
      }

      const payload = {
        ...expense,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Success',
        description: 'Expense created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create expense: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      if (!companyId) {
        throw new Error('Company context is required to update an expense.');
      }

      const { company_id: _ignoredCompanyId, ...safeUpdates } = updates;

      const { data, error } = await supabase
        .from('expenses')
        .update(safeUpdates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Success',
        description: 'Expense updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update expense: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    ...query,
    isLoading: query.isLoading || profileLoading,
    createExpense: createExpense.mutateAsync,
    updateExpense: updateExpense.mutateAsync,
  };
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async (expense: ExpenseInput) => {
      const companyId = profile?.companyId ?? profile?.company_id ?? null;

      if (!companyId) {
        throw new Error('Company context is required to create an expense.');
      }

      const payload = {
        ...expense,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Success',
        description: 'Expense created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create expense: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const companyId = profile?.companyId ?? profile?.company_id ?? null;

      if (!companyId) {
        throw new Error('Company context is required to update an expense.');
      }

      const { company_id: _ignoredCompanyId, ...safeUpdates } = updates;

      const { data, error } = await supabase
        .from('expenses')
        .update(safeUpdates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Success',
        description: 'Expense updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update expense: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
