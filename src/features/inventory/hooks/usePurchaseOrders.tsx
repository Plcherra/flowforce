import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import { useToast } from '@/hooks/use-toast';

export function usePurchaseOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => InventoryService.listPurchases(),
  });

  return { data, isLoading };
}

export function usePurchaseOrder(poId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: () => InventoryService.getPurchaseOrder(poId!),
    enabled: Boolean(poId),
  });

  return { data, isLoading };
}

export function useCreatePurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof InventoryService.createPurchaseOrder>[0]) =>
      InventoryService.createPurchaseOrder(payload),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({
        title: 'Purchase order created',
        description: po ? `PO ${po.po_number} has been created.` : 'Purchase order created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create purchase order',
        description: error.message || 'An unexpected error occurred while creating the purchase order.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof InventoryService.updatePurchaseOrder>[1];
    }) => InventoryService.updatePurchaseOrder(id, updates),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (po?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase-orders', po.id] });
      }
      toast({
        title: 'Purchase order updated',
        description: po ? `PO ${po.po_number} has been updated.` : 'Purchase order changes saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Unable to update purchase order.',
        variant: 'destructive',
      });
    },
  });
}

export function useReceivePurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof InventoryService.receivePurchaseOrder>[1];
    }) => InventoryService.receivePurchaseOrder(id, payload),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (po?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase-orders', po.id] });
      }
      toast({
        title: 'Purchase order received',
        description: po
          ? `Receiving for PO ${po.po_number} has been recorded.`
          : 'Receiving data saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Receiving failed',
        description: error.message || 'Unable to record receiving for this purchase order.',
        variant: 'destructive',
      });
    },
  });
}

export function useRecordVendorInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof InventoryService.recordVendorInvoice>[0]) =>
      InventoryService.recordVendorInvoice(payload),
    onSuccess: (_result, payload) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (payload?.invoiceNumber) {
        queryClient.invalidateQueries({ queryKey: ['vendor-invoices', payload.invoiceNumber] });
      }
      toast({
        title: 'Invoice logged',
        description: 'Vendor invoice has been recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Invoice logging failed',
        description: error.message || 'Unable to record vendor invoice.',
        variant: 'destructive',
      });
    },
  });
}

export function useVendorInvoices(poNumber?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-invoices', poNumber],
    queryFn: () => InventoryService.listVendorInvoices(poNumber),
    enabled: true,
  });

  return { data, isLoading };
}

export function useSupplierIntegrationLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplierId,
      integration,
    }: {
      supplierId: string;
      integration: Parameters<typeof InventoryService.linkSupplierIntegration>[1];
    }) => InventoryService.linkSupplierIntegration(supplierId, integration),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
      if (supplier?.id) {
        queryClient.invalidateQueries({ queryKey: ['inventory-suppliers', supplier.id] });
      }
      toast({
        title: 'Supplier linked',
        description: supplier
          ? `${supplier.name} is now linked to ${supplier.integration?.provider ?? 'the selected provider'}.`
          : 'Supplier integration updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Integration failed',
        description: error.message || 'Unable to link supplier integration.',
        variant: 'destructive',
      });
    },
  });
}
