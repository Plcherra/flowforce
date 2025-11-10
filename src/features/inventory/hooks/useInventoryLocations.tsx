import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

export interface InventoryLocation {
  id: string;
  name: string;
  location_type: string;
  temperature_controlled?: boolean;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export function useInventoryLocations() {
  return useQuery({
    queryKey: ['inventory-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inv_locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as InventoryLocation[];
    },
  });
}

export function useCreateInventoryLocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async (locationData: { name: string; location_type: string; temperature_controlled?: boolean }) => {
      if (!profile?.company_id) {
        throw new Error('Company information not found. Please ensure you are logged in.');
      }

      const { data, error } = await supabase
        .from('inv_locations')
        .insert({
          ...locationData,
          company_id: profile.company_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
      toast({
        title: 'Success',
        description: 'Location created successfully',
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create location';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      console.error('Create location error:', error);
    },
  });
}

export function useDeleteInventoryLocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('inv_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete location';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      console.error('Delete location error:', error);
    },
  });
}