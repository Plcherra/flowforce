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
        title: "Success",
        description: "Location created successfully",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to create location";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      logger.error("Create location error", { error, tags: ["error"] });
    },
  });
}

export function useDeleteInventoryLocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      await InventoryService.deleteLocation(locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-locations"] });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to delete location";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      logger.error("Delete location error", { error, tags: ["error"] });
    },
  });
}
