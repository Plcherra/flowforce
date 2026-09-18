import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InventorySupplier } from "./types";
import { logger } from "@/utils/logger";

const EMPTY_SUPPLIERS: InventorySupplier[] = [];

export function useInventorySuppliers(companyId?: string | null) {
  const query = useQuery({
    queryKey: ["inventory-suppliers", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from("inv_suppliers")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as InventorySupplier[];
    },
  });

  return {
    data: query.data ?? EMPTY_SUPPLIERS,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}

export function useCreateSupplier() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierData: {
      name: string;
      contact_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      payment_terms?: string;
      notes?: string;
    }) => {
      // First get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("No company associated with user");
      }

      const { data, error } = await supabase
        .from("inv_suppliers")
        .insert({
          ...supplierData,
          company_id: profile.company_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        logger.error("Database error", { error, tags: ["error"] });
        throw new Error(error.message || "Failed to create supplier");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
    },
    onError: (error: Error) => {
      logger.error("Create supplier error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSupplier() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("inv_suppliers")
        .update({ name: payload.name })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      toast({
        title: "Success",
        description: "Supplier updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSupplier() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      const { error } = await supabase
        .from("inv_suppliers")
        .update({ is_active: false })
        .eq("id", supplierId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      toast({
        title: "Success",
        description: "Supplier removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });
}
