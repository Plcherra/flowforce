import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventoryTransfer,
  listInventoryTransfers,
  updateInventoryTransferStatus,
} from "@/features/inventory/repositories/transfersRepository";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import type { InventoryTransfer, InventoryTransferStatus } from "./types";

export interface TransferItemInput {
  item_id: string;
  unitid: string;
  quantity: number;
  cost_per_unit?: number | null;
}

export interface CreateInventoryTransferInput {
  from_location_id: string;
  to_location_id: string;
  fulfillerid: string;
  recipientid: string;
  delivery_date?: string | null;
  comments?: string | null;
  status_note?: string | null;
  items: TransferItemInput[];
}

export interface UpdateInventoryTransferStatusInput {
  id: string;
  status: InventoryTransferStatus;
  status_note?: string | null;
}

export function useInventoryTransfers() {
  const { profile, loading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  return useQuery<InventoryTransfer[]>({
    queryKey: ["inventory-transfers", companyId],
    queryFn: () => {
      if (!companyId) {
        throw new Error(
          "Company context is required to list inventory transfers.",
        );
      }
      return listInventoryTransfers(companyId);
    },
    enabled: Boolean(companyId) && !loading,
  });
}

export function useCreateInventoryTransfer() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async (payload: CreateInventoryTransferInput) => {
      if (!profile?.userId && !profile?.id) {
        throw new Error("Profile not loaded. Please sign in again.");
      }

      const companyId = profile.companyId ?? profile.company_id;
      if (!companyId) {
        throw new Error(
          "Company information missing. Unable to create transfer.",
        );
      }

      const requestedBy = profile.userId ?? profile.id;

      if (!payload.items || payload.items.length === 0) {
        throw new Error("At least one item is required for a transfer.");
      }

      return createInventoryTransfer({
        ...payload,
        company_id: companyId,
        requested_by: requestedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      toast({
        title: t("literals.transferRequested"),
        description: t("literals.theFulfillerWillBeNotifiedOfThisTransfer"),
      });
    },
    onError: (error: any) => {
      const message = error?.message ?? t("literals.failedToCreateTransfer");
      toast({
        title: t("literals.transferFailed"),
        description: message,
        variant: "destructive",
      });
      throw error;
    },
  });
}

export function useUpdateInventoryTransferStatus() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      status_note,
    }: UpdateInventoryTransferStatusInput) => {
      if (!profile?.userId && !profile?.id) {
        throw new Error("Profile not loaded. Please sign in again.");
      }

      const actorId = profile.userId ?? profile.id;

      return updateInventoryTransferStatus(id, {
        actorid: actorId,
        status,
        status_note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
      toast({
        title: t("literals.transferUpdated"),
        description: t("literals.transferStatusHasBeenUpdated"),
      });
    },
    onError: (error: any) => {
      const message = error?.message ?? t("literals.failedToUpdateTransferStatus");
      toast({
        title: t("literals.updateFailed"),
        description: message,
        variant: "destructive",
      });
      throw error;
    },
  });
}
