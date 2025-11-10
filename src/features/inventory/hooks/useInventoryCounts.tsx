import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  addInventoryItemToCount,
  addInventoryItemsToCount,
  approveInventoryCount as approveCountRepository,
  completeInventoryCount as completeCountRepository,
  createInventoryCount,
  deleteInventoryCount,
  listInventoryCountEvents,
  listInventoryCountLines,
  listInventoryCounts,
  rejectInventoryCount as rejectCountRepository,
  removeInventoryItemFromCount,
  submitInventoryCount as submitCountRepository,
  updateInventoryCount,
  updateInventoryCountLine,
} from '@/features/inventory/repositories/countsRepository';
import type { CreateInventoryCountInput } from '@/features/inventory/repositories/countsRepository';
import type { InventoryCount, InventoryCountLine } from './types';

export function useInventoryCounts() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const data = await listInventoryCounts();
      setCounts(data);
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

  const createCount = async (countData: CreateInventoryCountInput) => {
    try {
      const created = await createInventoryCount(countData);

      toast({
        title: "Success",
        description: "Inventory count created successfully",
      });

      fetchCounts();
      return created;
    } catch (error: any) {
      console.error('Error creating count:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create inventory count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCount = async (countId: string, updates: Partial<InventoryCount>) => {
    try {
      await updateInventoryCount(countId, updates);

      toast({
        title: "Success",
        description: "Count updated successfully",
      });

      fetchCounts();
    } catch (error: any) {
      console.error('Error updating count:', error);
      toast({
        title: "Error", 
        description: error?.message || "Failed to update count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const completeCount = async (countId: string) => {
    try {
      await completeCountRepository(countId);

      toast({
        title: "Success",
        description: "Count submitted for review",
      });

      fetchCounts();
    } catch (error: any) {
      console.error('Error completing count:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to complete count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCount = async (countId: string) => {
    try {
      await deleteInventoryCount(countId);

      toast({
        title: "Success",
        description: "Count deleted successfully",
      });

      fetchCounts();
    } catch (error: any) {
      console.error('Error deleting count:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete count", 
        variant: "destructive",
      });
      throw error;
    }
  };

  const submitCountForReview = async (countId: string) => {
    try {
      await submitCountRepository(countId);
      toast({
        title: "Submitted",
        description: "Count sent for supervisor review",
      });
      fetchCounts();
    } catch (error: any) {
      console.error('Error submitting count:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit count for review",
        variant: "destructive",
      });
      throw error;
    }
  };

  const approveCount = async (countId: string, notes?: string) => {
    try {
      await approveCountRepository(countId, { notes });
      toast({
        title: "Approved",
        description: "Inventory count approved",
      });
      fetchCounts();
    } catch (error: any) {
      console.error('Error approving count:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to approve count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const rejectCount = async (countId: string, notes?: string) => {
    try {
      await rejectCountRepository(countId, { notes });
      toast({
        title: "Sent back",
        description: "Count requires additional review",
      });
      fetchCounts();
    } catch (error: any) {
      console.error('Error rejecting count:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send count back for revisions",
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
    submitCountForReview,
    approveCount,
    rejectCount,
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

    setLoading(true);
    try {
      const data = await listInventoryCountLines(countId);
      setCountLines(data);
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

  const addItemsToCount = async (items: Array<{ id: string; expectedQuantity?: number }>) => {
    if (!countId || items.length === 0) return;

    try {
      await addInventoryItemsToCount(countId, items);
      toast({
        title: "Success",
        description: items.length > 1 ? "Items added to count" : "Item added to count",
      });
      fetchCountLines();
    } catch (error) {
      console.error('Error adding items to count:', error);
      toast({
        title: "Error",
        description: "Failed to add items to count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addItemToCount = async (itemId: string, expectedQuantity: number = 0) => {
    if (!countId) return;
    return addInventoryItemToCount(countId, itemId, expectedQuantity);
  };

  const updateCountLine = async (lineId: string, updates: Partial<InventoryCountLine>) => {
    try {
      await updateInventoryCountLine(lineId, updates);

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
      await removeInventoryItemFromCount(lineId);

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
    addItemsToCount,
    updateCountLine,
    removeItemFromCount,
    refetch: fetchCountLines
  };
}
