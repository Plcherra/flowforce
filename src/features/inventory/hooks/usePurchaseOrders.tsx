import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  listVendorInvoices,
  linkSupplierIntegration,
  receivePurchaseOrder,
  recordVendorInvoice,
  updatePurchaseOrder,
  type CreatePurchaseOrderInput,
  type ReceivePurchaseOrderInput,
  type RecordVendorInvoiceInput,
  type SupplierIntegrationInput,
  type UpdatePurchaseOrderInput,
} from "@/features/inventory/repositories/purchasingRepository";
import { useToast } from "@/hooks/use-toast";

export function usePurchaseOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => listPurchaseOrders(),
  });

  return { data, isLoading };
}

export function usePurchaseOrder(poId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", poId],
    queryFn: () => getPurchaseOrder(poId!),
    enabled: Boolean(poId),
  });

  return { data, isLoading };
}

export function useCreatePurchaseOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderInput) =>
      createPurchaseOrder(payload),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({
        title: t("literals.purchaseOrderCreated"),
        description: po
          ? t("literals.poHasBeenCreated", { po_number: po.po_number })
          : t("literals.purchaseOrderCreatedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("literals.failedToCreatePurchaseOrder"),
        description:
          error.message ||
          t("literals.anUnexpectedErrorOccurredWhileCreatingThePurchase"),
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdatePurchaseOrderInput;
    }) => updatePurchaseOrder(id, updates),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (po?.id) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders", po.id] });
      }
      toast({
        title: t("literals.purchaseOrderUpdated"),
        description: po
          ? t("literals.poHasBeenUpdated", { po_number: po.po_number })
          : t("literals.purchaseOrderChangesSaved"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("literals.updateFailed2"),
        description: error.message || t("literals.unableToUpdatePurchaseOrder"),
        variant: "destructive",
      });
    },
  });
}

export function useReceivePurchaseOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ReceivePurchaseOrderInput;
    }) => receivePurchaseOrder(id, payload),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (po?.id) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders", po.id] });
      }
      toast({
        title: t("literals.purchaseOrderReceived"),
        description: po
          ? t("literals.receivingForPoHasBeenRecorded", { po_number: po.po_number })
          : t("literals.receivingDataSavedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("literals.receivingFailed"),
        description:
          error.message ||
          t("literals.unableToRecordReceivingForThisPurchaseOrder"),
        variant: "destructive",
      });
    },
  });
}

export function useRecordVendorInvoice() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecordVendorInvoiceInput) =>
      recordVendorInvoice(payload),
    onSuccess: (_result, payload) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (payload?.invoiceNumber) {
        queryClient.invalidateQueries({
          queryKey: ["vendor-invoices", payload.invoiceNumber],
        });
      }
      toast({
        title: t("literals.invoiceLogged"),
        description: t("literals.vendorInvoiceHasBeenRecorded"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("literals.invoiceLoggingFailed"),
        description: error.message || t("literals.unableToRecordVendorInvoice"),
        variant: "destructive",
      });
    },
  });
}

export function useVendorInvoices(poNumber?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-invoices", poNumber],
    queryFn: () => listVendorInvoices(poNumber),
    enabled: true,
  });

  return { data, isLoading };
}

export function useSupplierIntegrationLink() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      integration,
    }: {
      supplierId: string;
      integration: SupplierIntegrationInput;
    }) => linkSupplierIntegration(supplierId, integration),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      if (supplier?.id) {
        queryClient.invalidateQueries({
          queryKey: ["inventory-suppliers", supplier.id],
        });
      }
      toast({
        title: t("literals.supplierLinked"),
        description: supplier
          ? t("literals.isNowLinkedTo", { name: supplier.name, value1: supplier.integration?.provider ?? "the selected provider" })
          : t("literals.supplierIntegrationUpdated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("literals.integrationFailed"),
        description: error.message || t("literals.unableToLinkSupplierIntegration"),
        variant: "destructive",
      });
    },
  });
}
