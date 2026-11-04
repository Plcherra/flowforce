import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { InventoryCategory } from "./types";
import { logger } from "@/utils/logger";

export function useInventoryCategories() {
  const { profile, loading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;

  return useQuery({
    queryKey: ["inventory-categories", companyId ?? "unknown"],
    enabled: Boolean(companyId) && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      return data as InventoryCategory[];
    },
  });
}

export function useCreateInventoryCategory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async (categoryData: {
      name: string;
      description?: string;
    }) => {
      if (!profile?.company_id) {
        throw new Error(
          "Company information not found. Please ensure you are logged in.",
        );
      }

      const { data, error } = await supabase
        .from("inventory_categories")
        .insert({
          ...categoryData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      toast({
        title: t("literals.success"),
        description: t("literals.categoryCreatedSuccessfully"),
      });
    },
    onError: (error: any) => {
      const message = error?.message || t("literals.failedToCreateCategory");
      toast({
        title: t("literals.error"),
        description: message,
        variant: "destructive",
      });
      logger.error("Create category error", { error, tags: ["error"] });
    },
  });
}

export function useUpdateInventoryCategory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("inventory_categories")
        .update({
          name: payload.name,
          description: payload.description,
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      toast({
        title: t("literals.success"),
        description: t("literals.categoryUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("literals.error"),
        description: error?.message || t("literals.failedToUpdateCategory"),
        variant: "destructive",
      });
      logger.error("Update category error", { error, tags: ["error"] });
    },
  });
}

export function useDeleteInventoryCategory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("inventory_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      toast({
        title: t("literals.success"),
        description: t("literals.categoryDeletedSuccessfully"),
      });
    },
    onError: (error: any) => {
      let message = t("literals.failedToDeleteCategory");

      // Handle specific error cases
      if (error?.code === "PGRST301") {
        message = "You do not have permission to delete this category.";
      } else if (error?.code === "23503") {
        message =
          "Cannot delete category as it is being used by inventory items.";
      } else if (error?.message) {
        message = error.message;
      }

      toast({
        title: t("literals.error"),
        description: message,
        variant: "destructive",
      });
      logger.error("Delete category error", { error, tags: ["error"] });
    },
  });
}
