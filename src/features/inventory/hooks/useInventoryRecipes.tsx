import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InventoryService } from "@/features/inventory/services/inventoryService";
import type { InventoryRecipeLine } from "./types";

export function useInventoryRecipes(itemId?: string) {
  return useQuery({
    queryKey: ["inventory-recipes", itemId],
    queryFn: () => InventoryService.listItemRecipes(itemId || ""),
    enabled: !!itemId,
  });
}

export function useUpsertRecipeLine(itemId?: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (
      line: Omit<
        InventoryRecipeLine,
        "created_at" | "updated_at" | "ingredient" | "unit" | "item_id"
      > & { item_id: string },
    ) => InventoryService.upsertRecipeLine(line),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-recipes", itemId],
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: t("literals.recipeUpdated"),
        description: t("literals.ingredientSavedSuccessfully"),
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: t("literals.failedToUpdateRecipe"),
        description: message || t("literals.unableToSaveIngredientPleaseTryAgain"),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRecipeLine(itemId?: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (lineId: string) => InventoryService.deleteRecipeLine(lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-recipes", itemId],
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: t("literals.ingredientRemoved"),
        description: t("literals.recipeIngredientDeleted"),
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: t("literals.failedToRemoveIngredient"),
        description:
          message || t("literals.unableToDeleteIngredientPleaseTryAgain"),
        variant: "destructive",
      });
    },
  });
}
