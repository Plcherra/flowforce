import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InventoryService } from "@/features/inventory/services/inventoryService";
import { logger } from "@/utils/logger";

// Re-export interfaces for compatibility
export interface InventoryWaste {
  id: string;
  item_id: string;
  location_id?: string;
  quantity: number;
  unitid?: string;
  waste_type:
    | "spoilage"
    | "prep_error"
    | "accident"
    | "theft"
    | "expired"
    | "damaged"
    | "other";
  reason?: string;
  reasoncategory?: string | null;
  cost_impact?: number;
  shift_id?: string | null;
  metadata?: Record<string, unknown> | null;
  recorded_by: string;
  waste_date: string;
  created_at: string;
  updated_at?: string;
  item?: {
    name: string;
    cost_per_unit?: number | null;
    unit?: { name: string };
  };
  unit?: {
    name: string;
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
  unitid?: string;
  waste_type:
    | "spoilage"
    | "prep_error"
    | "accident"
    | "theft"
    | "expired"
    | "damaged"
    | "other";
  reason?: string;
  cost_impact?: number;
  waste_date?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAdjustmentData {
  item_id: string;
  location_id?: string;
  adjustment_type: "increase" | "decrease" | string;
  quantity: number;
  reason: string;
  cost_impact?: number;
  metadata?: Record<string, unknown>;
}

// Fetch waste records
export function useInventoryWaste() {
  return useQuery({
    queryKey: ["inventory-waste"],
    queryFn: () => InventoryService.getWasteEvents(),
  });
}

// Create waste record
export function useCreateWaste() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (wasteData: CreateWasteData) =>
      InventoryService.logWaste(wasteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-waste"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      toast({
        title: t("literals.wasteRecorded2"),
        description: t("literals.wasteEntryHasBeenSuccessfullyLogged"),
      });
    },
    onError: (error) => {
      logger.error("Error creating waste record", { error, tags: ["error"] });
      toast({
        title: t("literals.error"),
        description: t("literals.failedToRecordWastePleaseTryAgain"),
        variant: "destructive",
      });
    },
  });
}

export function useCreateInventoryAdjustment() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (adjustmentData: CreateAdjustmentData) =>
      InventoryService.adjustQuantity(adjustmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      toast({
        title: t("literals.adjustmentRecorded"),
        description: t("literals.inventoryAdjustmentHasBeenApplied"),
      });
    },
    onError: (error) => {
      logger.error("Error creating inventory adjustment", {
        error,
        tags: ["error"],
      });
      toast({
        title: t("literals.adjustmentFailed"),
        description: t("literals.failedToRecordAdjustmentPleaseTryAgain"),
        variant: "destructive",
      });
    },
  });
}

// Update waste record
export function useUpdateWaste() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: { id: string } & Partial<CreateWasteData>) =>
      InventoryService.updateWaste(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-waste"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      toast({
        title: t("literals.updated"),
        description: t("literals.wasteRecordHasBeenUpdated"),
      });
    },
    onError: (error) => {
      logger.error("Error updating waste record", { error, tags: ["error"] });
      toast({
        title: t("literals.error"),
        description: t("literals.failedToUpdateWasteRecordPleaseTryAgain"),
        variant: "destructive",
      });
    },
  });
}

// Delete waste record
export function useDeleteWaste() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => InventoryService.deleteWaste(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-waste"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      toast({
        title: t("literals.deleted"),
        description: t("literals.wasteRecordHasBeenDeleted"),
      });
    },
    onError: (error) => {
      logger.error("Error deleting waste record", { error, tags: ["error"] });
      toast({
        title: t("literals.error"),
        description: t("literals.failedToDeleteWasteRecordPleaseTryAgain"),
        variant: "destructive",
      });
    },
  });
}
