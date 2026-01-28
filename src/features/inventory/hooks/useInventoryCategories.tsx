import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { InventoryCategory } from "./types";
import { logger } from "@/utils/logger";

export function useInventoryCategories() {
  return useQuery({
    queryKey: ["inventory-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as InventoryCategory[];
    },
  });
}

export function useCreateInventoryCategory() {
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
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to create category";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      logger.error("Create category error", { error, tags: ["error"] });
    },
  });
}

export function useDeleteInventoryCategory() {
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
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: any) => {
      let message = "Failed to delete category";

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
        title: "Error",
        description: message,
        variant: "destructive",
      });
      logger.error("Delete category error", { error, tags: ["error"] });
    },
  });
}
