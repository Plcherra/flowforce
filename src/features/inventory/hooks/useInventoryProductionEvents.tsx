import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InventoryService } from "@/features/inventory/services/inventoryService";
import type { ProductionEvent, ProductionEventInput } from "./types";
import { logger } from "@/utils/logger";

const productionEventsQueryKey = ["inventory-production-events"];

export function useInventoryProductionEvents() {
  return useQuery<ProductionEvent[]>({
    queryKey: productionEventsQueryKey,
    queryFn: () => InventoryService.listProductionEvents(),
  });
}

export function useCreateProductionEvent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductionEventInput) =>
      InventoryService.createProductionEvent(payload),
    onSuccess: ({ warnings }) => {
      queryClient.invalidateQueries({ queryKey: productionEventsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });

      const description =
        warnings?.length && warnings.length > 0
          ? t("literals.recordedWithWarning", { length: warnings.length, value1: warnings.length > 1 ? "s" : "" })
          : t("literals.productionEventRecordedSuccessfully");

      toast({
        title: t("literals.productionRecorded"),
        description,
      });
    },
    onError: (error: any) => {
      const message = error?.message || t("literals.failedToRecordProductionEvent");
      toast({
        title: t("literals.error"),
        description: message,
        variant: "destructive",
      });
      logger.error("Create production event error", { error, tags: ["error"] });
    },
  });
}
