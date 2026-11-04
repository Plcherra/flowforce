import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InventoryService } from "@/features/inventory/services/inventoryService";
import {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUpdate,
} from "./types";
import { logger } from "@/utils/logger";

export function useInventoryItems() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<InventoryItem[], Error>({
    queryKey: ["inventory-items"],
    queryFn: () => InventoryService.listItems(),
  });

  return { data, isLoading, error };
}

export function useCreateInventoryItem() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData: InventoryItemInsert) =>
      InventoryService.createItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: t("literals.success"),
        description: t("literals.inventoryItemCreatedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      logger.error("Create inventory item error", { error, tags: ["error"] });
      toast({
        title: t("literals.error"),
        description: error.message || t("literals.failedToCreateInventoryItem"),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateInventoryItem() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: InventoryItemUpdate;
    }) => InventoryService.updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: t("literals.success"),
        description: t("literals.inventoryItemUpdatedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      logger.error("Update inventory item error", { error, tags: ["error"] });
      toast({
        title: t("literals.error"),
        description: error.message || t("literals.failedToUpdateInventoryItem"),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInventoryItem() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => InventoryService.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: t("literals.success"),
        description: t("literals.inventoryItemDeletedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      logger.error("Delete inventory item error", { error, tags: ["error"] });
      toast({
        title: t("literals.error"),
        description: error.message || t("literals.failedToDeleteInventoryItem"),
        variant: "destructive",
      });
    },
  });
}
