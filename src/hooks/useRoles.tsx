
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  employee_id: string;
}

export function useProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profiles', user?.id ?? 'guest'],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const metadataCompanyId =
        typeof user?.user_metadata?.company_id === 'string'
          ? (user.user_metadata.company_id as string)
          : null;

      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single();

      if (currentProfileError) {
        console.error('Error resolving current profile for admin listing:', currentProfileError);
      }

      const companyId = currentProfile?.company_id ?? metadataCompanyId;

      if (!companyId) {
        throw new Error('No company context available for profile listing');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
