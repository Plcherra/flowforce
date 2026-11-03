import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { InventoryService } from "@/features/inventory/services/inventoryService";
import type { InventoryLocation } from "@/features/inventory/hooks/types";
import { logger } from "@/utils/logger";

export function useInventoryLocations() {
  const { profile, loading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const { data, isLoading, error } = useQuery<InventoryLocation[], Error>({
    queryKey: ["inventory-locations", companyId ?? "unknown"],
    enabled: Boolean(companyId) && !loading,
    queryFn: () =>
      InventoryService.listLocations({ companyId: companyId ?? undefined }),
  });

  return { data, isLoading, error };
}

export function useCreateInventoryLocation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async (locationData: {
      name: string;
      location_type: string;
      temperature_controlled?: boolean;
    }) => {
      const companyId = profile?.companyId ?? profile?.company_id;
      if (!companyId) {
        throw new Error(
          "Company information not found. Please ensure you are logged in.",
        );
      }

      return InventoryService.createLocation({
        ...locationData,
        companyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
      toast({
        title: t("literals.success"),
        description: t("literals.locationCreatedSuccessfully"),
      });
    },
    onError: (error: any) => {
      const message = error?.message || t("literals.failedToCreateLocation");
      toast({
        title: t("literals.error"),
        description: message,
        variant: "destructive",
      });
      logger.error("Create location error", { error, tags: ["error"] });
    },
  });
}

export function useUpdateInventoryLocation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      location_type?: string;
      temperature_controlled?: boolean | null;
    }) => InventoryService.updateLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
      toast({
        title: t("literals.success"),
        description: t("literals.locationUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("literals.error"),
        description: error?.message || t("literals.failedToUpdateLocation"),
        variant: "destructive",
      });
      logger.error("Update location error", { error, tags: ["error"] });
    },
  });
}

export function useDeleteInventoryLocation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      await InventoryService.deleteLocation(locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
      toast({
        title: t("literals.success"),
        description: t("literals.locationDeletedSuccessfully"),
      });
    },
    onError: (error: any) => {
      const message = error?.message || t("literals.failedToDeleteLocation");
      toast({
        title: t("literals.error"),
        description: message,
        variant: "destructive",
      });
      logger.error("Delete location error", { error, tags: ["error"] });
    },
  });
}
