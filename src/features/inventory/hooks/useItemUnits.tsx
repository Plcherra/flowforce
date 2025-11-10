import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItemUnit } from './types';

export interface EnhancedInventoryItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  company_id: string;
  unit_id: string;
  unit_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  cost_per_unit?: number;
  preferred_supplier_id?: string;
  default_location_id?: string;
  shelf_life_days?: number;
  is_prep_item?: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  units: InventoryItemUnit[];
  primary_unit?: InventoryItemUnit;
  base_unit?: InventoryItemUnit;
  location?: {
    id: string;
    name: string;
    location_type: string;
  };
}

export function useItemUnits(itemId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['item-units', itemId],
    queryFn: async () => {
      let query = supabase
        .from('inv_item_units')
        .select(`
          *,
          unit:inv_units(*)
        `)
        .order('unit_level', { ascending: true });
    
      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItemUnit[];
    },
    enabled: !!itemId,
  });

  return { units: data || [], isLoading };
}

export function useEnhancedInventoryItems() {
  const { data, isLoading } = useQuery({
    queryKey: ['enhanced-inventory-items'],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from('inv_items')
        .select(`
          *,
          location:inv_locations(id, name, location_type)
        `);

      if (error) throw error;

      // Fetch units for all items
      const { data: units, error: unitsError } = await supabase
        .from('inv_item_units')
        .select(`
          *,
          unit:inv_units(*)
        `)
        .order('unit_level', { ascending: true });

      if (unitsError) throw unitsError;

      // Group units by item
      const itemUnitsMap = units.reduce((acc, unit) => {
        if (!acc[unit.item_id]) acc[unit.item_id] = [];
        acc[unit.item_id].push(unit);
        return acc;
      }, {} as Record<string, InventoryItemUnit[]>);

      // Combine items with their units
      const enhancedItems: EnhancedInventoryItem[] = items.map(item => {
        const itemUnits = itemUnitsMap[item.id] || [];
        const primaryUnit = itemUnits.find(u => u.is_primary);
        const baseUnit = itemUnits.find(u => u.unit?.is_base_unit);
        
        return {
          ...item,
          units: itemUnits,
          primary_unit: primaryUnit,
          base_unit: baseUnit,
        };
      });

      return enhancedItems;
    },
  });

  return { items: data || [], isLoading };
}

export function useCreateItemUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (unitData: Omit<InventoryItemUnit, 'id' | 'unit'> & { item_id: string; unit_id: string }) => {
      const { data, error } = await supabase
        .from('inv_item_units')
        .insert(unitData)
        .select(`
          *,
          unit:inv_units(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-units'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-inventory-items'] });
      toast({
        title: 'Success',
        description: 'Item unit configuration added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add item unit configuration',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateItemUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItemUnit> & { id: string }) => {
      const { data, error } = await supabase
        .from('inv_item_units')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          unit:inv_units(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-units'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-inventory-items'] });
      toast({
        title: 'Success',
        description: 'Item unit configuration updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update item unit configuration',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteItemUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inv_item_units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-units'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Removed',
        description: 'Unit configuration removed',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove unit configuration',
        variant: 'destructive',
      });
    },
  });
}

// Utility functions for unit conversions
export const convertBetweenUnits = (
  quantity: number,
  fromUnit: InventoryItemUnit,
  toUnit: InventoryItemUnit
): number => {
  // Convert to base units first, then to target unit
  const baseQuantity = quantity * fromUnit.conversion_factor;
  return baseQuantity / toUnit.conversion_factor;
};

export const formatUnitDisplay = (unit: InventoryItemUnit): string => {
  if (!unit.unit) return 'Unknown';
  
  const unitName = unit.unit.abbreviation || unit.unit.name;
  const conversionText = unit.conversion_factor > 1 
    ? ` (${unit.conversion_factor} ${unit.unit.name === 'Each' ? 'EA' : 'units'})`
    : '';
    
  return `${unitName}${conversionText}`;
};

export const getUnitHierarchyDisplay = (units: InventoryItemUnit[]): string => {
  const sortedUnits = units
    .filter(u => u.is_countable)
    .sort((a, b) => a.unit_level - b.unit_level);
  
  return sortedUnits
    .map(unit => formatUnitDisplay(unit))
    .join(' → ');
};
