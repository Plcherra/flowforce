import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InventoryUnit } from './types';

export function useInventoryUnits() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inv_units')
        .select('*')
        .eq('is_active', true)
        .order('unit_type, name');

      if (error) throw error;
      return data as InventoryUnit[];
    },
  });

  // Group units by type for easier display
  const groupedUnits = data?.reduce((acc, unit) => {
    if (!acc[unit.unit_type]) {
      acc[unit.unit_type] = [];
    }
    acc[unit.unit_type].push(unit);
    return acc;
  }, {} as Record<string, InventoryUnit[]>) || {};

  return { 
    data, 
    isLoading, 
    groupedUnits,
    weightUnits: groupedUnits.weight || [],
    volumeUnits: groupedUnits.volume || [],
    countUnits: groupedUnits.count || []
  };
}