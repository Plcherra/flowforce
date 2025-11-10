import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { InventoryService } from '@/features/inventory/services/inventoryService';

// Re-export interfaces for compatibility
export interface InventoryWaste {
  id: string;
  item_id: string;
  location_id?: string;
  quantity: number;
  unit_id?: string;
  waste_type: 'spoilage' | 'prep_error' | 'accident' | 'theft' | 'expired' | 'damaged' | 'other';
  reason?: string;
  cost_impact?: number;
  recorded_by: string;
  waste_date: string;
  created_at: string;
  updated_at?: string;
  item?: {
    name: string;
    unit?: { name: string };
  };
  location?: {
    name: string;
  };
  recorder?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateWasteData {
  item_id: string;
  location_id?: string;
  quantity: number;
  unit_id?: string;
  waste_type: 'spoilage' | 'prep_error' | 'accident' | 'theft' | 'expired' | 'damaged' | 'other';
  reason?: string;
  cost_impact?: number;
  waste_date?: string;
}

// Fetch waste records
export function useInventoryWaste() {
  return useQuery({
    queryKey: ['inventory-waste'],
    queryFn: () => InventoryService.getWasteEvents()
  });
}

// Create waste record
export function useCreateWaste() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (wasteData: CreateWasteData) => InventoryService.logWaste(wasteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-waste'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast({
        title: 'Waste Recorded',
        description: 'Waste entry has been successfully logged',
      });
    },
    onError: (error) => {
      console.error('Error creating waste record:', error);
      toast({
        title: 'Error',
        description: 'Failed to record waste. Please try again.',
        variant: 'destructive',
      });
    }
  });
}

// Update waste record
export function useUpdateWaste() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<CreateWasteData>) => 
      InventoryService.updateWaste(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-waste'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast({
        title: 'Updated',
        description: 'Waste record has been updated',
      });
    },
    onError: (error) => {
      console.error('Error updating waste record:', error);
      toast({
        title: 'Error',
        description: 'Failed to update waste record. Please try again.',
        variant: 'destructive',
      });
    }
  });
}

// Delete waste record
export function useDeleteWaste() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => InventoryService.deleteWaste(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-waste'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast({
        title: 'Deleted',
        description: 'Waste record has been deleted',
      });
    },
    onError: (error) => {
      console.error('Error deleting waste record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete waste record. Please try again.',
        variant: 'destructive',
      });
    }
  });
}