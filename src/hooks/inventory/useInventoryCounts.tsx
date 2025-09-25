import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InventoryCount, InventoryCountLine } from './types';

export function useInventoryCounts() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('inv_counts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCounts(data || []);
    } catch (error) {
      console.error('Error fetching counts:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory counts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCount = async (countData: {
    type: string;
    locations: string[];
    categories: string[];
    scheduleDate: string;
    notes: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('inv_counts')
        .insert({
          count_type: countData.type,
          count_date: countData.scheduleDate.split('T')[0],
          location_id: countData.locations[0] || null,
          notes: countData.notes,
          status: 'planned',
          counted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Inventory count created successfully",
      });

      fetchCounts(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error creating count:', error);
      toast({
        title: "Error",
        description: "Failed to create inventory count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCount = async (countId: string, updates: Partial<InventoryCount>) => {
    try {
      const { error } = await supabase
        .from('inv_counts')
        .update(updates)
        .eq('id', countId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Count updated successfully",
      });

      fetchCounts();
    } catch (error) {
      console.error('Error updating count:', error);
      toast({
        title: "Error", 
        description: "Failed to update count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const completeCount = async (countId: string) => {
    try {
      const { error } = await supabase
        .from('inv_counts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', countId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Count completed successfully",
      });

      fetchCounts();
    } catch (error) {
      console.error('Error completing count:', error);
      toast({
        title: "Error",
        description: "Failed to complete count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCount = async (countId: string) => {
    try {
      // First delete all related count lines
      const { error: linesError } = await supabase
        .from('inv_count_lines')
        .delete()
        .eq('count_id', countId);

      if (linesError) throw linesError;

      // Then delete the count itself
      const { error } = await supabase
        .from('inv_counts')
        .delete()
        .eq('id', countId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Count deleted successfully",
      });

      fetchCounts();
    } catch (error) {
      console.error('Error deleting count:', error);
      toast({
        title: "Error",
        description: "Failed to delete count", 
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return {
    counts,
    loading,
    createCount,
    updateCount,
    deleteCount,
    completeCount,
    refetch: fetchCounts
  };
}

export function useInventoryCountLines(countId?: string) {
  const [countLines, setCountLines] = useState<InventoryCountLine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCountLines = async () => {
    if (!countId) {
      setCountLines([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inv_count_lines')
        .select(`
          *,
          inv_items (
            name
          )
        `)
        .eq('count_id', countId);

      if (error) throw error;
      setCountLines(data || []);
    } catch (error) {
      console.error('Error fetching count lines:', error);
      toast({
        title: "Error",
        description: "Failed to load count details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItemToCount = async (itemId: string, expectedQuantity: number = 0) => {
    if (!countId) return;

    try {
      const { data, error } = await supabase
        .from('inv_count_lines')
        .insert({
          count_id: countId,
          item_id: itemId,
          expected_quantity: expectedQuantity,
          counted_quantity: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to count",
      });

      fetchCountLines();
      return data;
    } catch (error) {
      console.error('Error adding item to count:', error);
      toast({
        title: "Error",
        description: "Failed to add item to count",
        variant: "destructive", 
      });
      throw error;
    }
  };

  const updateCountLine = async (lineId: string, updates: Partial<InventoryCountLine>) => {
    try {
      const { error } = await supabase
        .from('inv_count_lines')
        .update(updates)
        .eq('id', lineId);

      if (error) throw error;

      fetchCountLines();
    } catch (error) {
      console.error('Error updating count line:', error);
      toast({
        title: "Error",
        description: "Failed to update count line",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeItemFromCount = async (lineId: string) => {
    try {
      const { error } = await supabase
        .from('inv_count_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item removed from count",
      });

      fetchCountLines();
    } catch (error) {
      console.error('Error removing item from count:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from count",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCountLines();
  }, [countId]);

  return {
    countLines,
    loading,
    addItemToCount,
    updateCountLine,
    removeItemFromCount,
    refetch: fetchCountLines
  };
}