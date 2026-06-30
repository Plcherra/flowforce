import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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
} from "@/features/inventory/repositories/countsRepository";
import type { CreateInventoryCountInput } from "@/features/inventory/repositories/countsRepository";
import type { InventoryCount, InventoryCountLine } from "./types";
import {
  isOfflineQueueableError,
  queueOfflineInventoryCountCreate,
  queueOfflineInventoryCountLineUpdate,
  queueOfflineInventoryCountSubmit,
  queueOfflineInventoryCountUpdate,
} from "@/services/mobile/mobileOfflineCriticalWorkflows";
import { logger } from "@/utils/logger";

const buildOfflineCountStub = (
  queueId: string,
  userId: string,
  payload: CreateInventoryCountInput,
): InventoryCount =>
  ({
    id: queueId,
    count_type: payload.type,
    count_period: payload.period ?? null,
    count_date: payload.scheduleDate,
    status: "planned",
    review_status: "pending_offline_sync",
    notes: payload.notes ?? "",
    description: payload.description ?? null,
    counted_by: userId,
    locations: [],
    created_at: new Date().toISOString(),
  }) as unknown as InventoryCount;

export function useInventoryCounts() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const data = await listInventoryCounts();
      setCounts(data);
    } catch (error) {
      logger.error("Error fetching counts:", { error, tags: ["error"] });
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
    } catch (error: unknown) {
      logger.error("Error creating count:", { error, tags: ["error"] });
      if (isOfflineQueueableError(error) && user?.id && companyId) {
        const queued = queueOfflineInventoryCountCreate({
          companyId,
          userId: user.id,
          payload: countData as unknown as Record<string, unknown>,
        });
        const offlineCount = buildOfflineCountStub(
          queued.optimisticKey,
          user.id,
          countData,
        );
        setCounts((current) => [offlineCount, ...current]);
        toast({
          title: "Saved offline",
          description: "Inventory count will sync when connection returns.",
        });
        return offlineCount;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create inventory count";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCount = async (
    countId: string,
    updates: Partial<InventoryCount>,
  ) => {
    try {
      await updateInventoryCount(countId, updates);

      toast({
        title: "Success",
        description: "Count updated successfully",
      });

      fetchCounts();
    } catch (error: unknown) {
      logger.error("Error updating count:", { error, tags: ["error"] });
      if (isOfflineQueueableError(error) && user?.id && companyId) {
        queueOfflineInventoryCountUpdate({
          companyId,
          userId: user.id,
          countId,
          updates: updates as Record<string, unknown>,
        });
        setCounts((current) =>
          current.map((count) =>
            count.id === countId
              ? {
                  ...count,
                  ...updates,
                  review_status:
                    updates.review_status ?? "pending_offline_sync",
                }
              : count,
          ),
        );
        toast({
          title: "Saved offline",
          description: "Count changes will sync when connection returns.",
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : "Failed to update count";
      toast({
        title: "Error",
        description: message,
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
    } catch (error: unknown) {
      logger.error("Error completing count:", { error, tags: ["error"] });
      if (isOfflineQueueableError(error) && user?.id && companyId) {
        queueOfflineInventoryCountSubmit({
          companyId,
          userId: user.id,
          countId,
          operation: "complete",
        });
        setCounts((current) =>
          current.map((count) =>
            count.id === countId
              ? {
                  ...count,
                  status: "completed",
                  review_status: "pending_review_sync",
                }
              : count,
          ),
        );
        toast({
          title: "Saved offline",
          description: "Completed count will sync for review when online.",
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : "Failed to complete count";
      toast({
        title: "Error",
        description: message,
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
    } catch (error: unknown) {
      logger.error("Error deleting count:", { error, tags: ["error"] });
      const message =
        error instanceof Error ? error.message : "Failed to delete count";
      toast({
        title: "Error",
        description: message,
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
    } catch (error: unknown) {
      logger.error("Error submitting count:", { error, tags: ["error"] });
      if (isOfflineQueueableError(error) && user?.id && companyId) {
        queueOfflineInventoryCountSubmit({
          companyId,
          userId: user.id,
          countId,
          operation: "submit",
        });
        setCounts((current) =>
          current.map((count) =>
            count.id === countId
              ? {
                  ...count,
                  status: "submitted",
                  review_status: "pending_review_sync",
                }
              : count,
          ),
        );
        toast({
          title: "Saved offline",
          description: "Count review request will sync when online.",
        });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit count for review";
      toast({
        title: "Error",
        description: message,
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
    } catch (error: unknown) {
      logger.error("Error approving count:", { error, tags: ["error"] });
      const message =
        error instanceof Error ? error.message : "Failed to approve count";
      toast({
        title: "Error",
        description: message,
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
    } catch (error: unknown) {
      logger.error("Error rejecting count:", { error, tags: ["error"] });
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send count back for revisions";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
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
    refetch: fetchCounts,
  };
}

export function useInventoryCountLines(countId?: string) {
  const [countLines, setCountLines] = useState<InventoryCountLine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

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
      logger.error("Error fetching count lines:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to load count details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItemsToCount = async (
    items: Array<{ id: string; expectedQuantity?: number }>,
  ) => {
    if (!countId || items.length === 0) return;

    try {
      await addInventoryItemsToCount(countId, items);
      toast({
        title: "Success",
        description:
          items.length > 1 ? "Items added to count" : "Item added to count",
      });
      fetchCountLines();
    } catch (error) {
      logger.error("Error adding items to count:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to add items to count",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addItemToCount = async (
    itemId: string,
    expectedQuantity: number = 0,
  ) => {
    if (!countId) return;
    return addInventoryItemToCount(countId, itemId, expectedQuantity);
  };

  const updateCountLine = async (
    lineId: string,
    updates: Partial<InventoryCountLine>,
  ) => {
    try {
      await updateInventoryCountLine(lineId, updates);

      fetchCountLines();
    } catch (error) {
      logger.error("Error updating count line:", { error, tags: ["error"] });
      if (isOfflineQueueableError(error) && user?.id && companyId && countId) {
        queueOfflineInventoryCountLineUpdate({
          companyId,
          userId: user.id,
          countId,
          lineId,
          updates: updates as Record<string, unknown>,
        });
        setCountLines((current) =>
          current.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  ...updates,
                  review_status: "pending_offline_sync",
                }
              : line,
          ),
        );
        toast({
          title: "Saved offline",
          description: "Count line will sync when connection returns.",
        });
        return;
      }

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
      logger.error("Error removing item from count:", {
        error,
        tags: ["error"],
      });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [countId]);

  return {
    countLines,
    loading,
    addItemToCount,
    addItemsToCount,
    updateCountLine,
    removeItemFromCount,
    refetch: fetchCountLines,
  };
}
