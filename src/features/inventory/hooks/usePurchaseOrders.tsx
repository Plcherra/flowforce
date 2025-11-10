import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
} from '@/features/inventory/repositories/purchasingRepository';
import { useToast } from '@/hooks/use-toast';

export function usePurchaseOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => listPurchaseOrders(),
  });

  return { data, isLoading };
}

export function usePurchaseOrder(poId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: () => getPurchaseOrder(poId!),
    enabled: Boolean(poId),
  });

  return { data, isLoading };
}

export function useCreatePurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderInput) => createPurchaseOrder(payload),
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
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePurchaseOrderInput }) => updatePurchaseOrder(id, updates),
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
    mutationFn: ({ id, payload }: { id: string; payload: ReceivePurchaseOrderInput }) =>
      receivePurchaseOrder(id, payload),
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
    mutationFn: (payload: RecordVendorInvoiceInput) => recordVendorInvoice(payload),
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
    queryFn: () => listVendorInvoices(poNumber),
    enabled: true,
  });

  return { data, isLoading };
}

export function useSupplierIntegrationLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ supplierId, integration }: { supplierId: string; integration: SupplierIntegrationInput }) =>
      linkSupplierIntegration(supplierId, integration),
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
