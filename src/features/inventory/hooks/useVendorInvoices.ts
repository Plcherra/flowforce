import { useState, useMemo, useCallback } from "react";
import type { PurchaseOrder, VendorInvoiceRecord } from "../hooks/types";
import type { InvoiceFormState } from "../types/purchasing";

interface UseVendorInvoicesProps {
  purchaseOrders: PurchaseOrder[];
  vendorInvoices: VendorInvoiceRecord[];
  outstandingByPo: Map<string, number>;
}

export function useVendorInvoices({
  purchaseOrders,
  vendorInvoices,
  outstandingByPo,
}: UseVendorInvoicesProps) {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>({
    po_id: "",
    invoiceNumber: "",
    amount: "",
    dueDate: "",
    notes: "",
    paymentMethod: "bank_transfer",
  });

  const selectedInvoicePo = useMemo<PurchaseOrder | null>(
    () => purchaseOrders.find((po) => po.id === invoiceForm.po_id) ?? null,
    [purchaseOrders, invoiceForm.po_id],
  );

  const invoicesForSelectedPo = useMemo(
    () =>
      selectedInvoicePo
        ? vendorInvoices.filter(
            (invoice) =>
              invoice.reference_number === selectedInvoicePo.po_number,
          )
        : [],
    [selectedInvoicePo, vendorInvoices],
  );

  const outstandingForSelectedPo =
    selectedInvoicePo && outstandingByPo.has(selectedInvoicePo.id)
      ? (outstandingByPo.get(selectedInvoicePo.id) ?? 0)
      : 0;

  const totalOutstandingValue = useMemo(
    () =>
      vendorInvoices
        .filter(
          (invoice) =>
            invoice.status === "pending" || invoice.status === "approved",
        )
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    [vendorInvoices],
  );

  const updateInvoiceForm = useCallback(
    (updates: Partial<InvoiceFormState>) => {
      setInvoiceForm((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const resetInvoiceForm = useCallback(() => {
    setInvoiceForm({
      po_id: "",
      invoiceNumber: "",
      amount: "",
      dueDate: "",
      notes: "",
      paymentMethod: "bank_transfer",
    });
  }, []);

  return {
    invoiceDialogOpen,
    setInvoiceDialogOpen,
    invoiceForm,
    updateInvoiceForm,
    resetInvoiceForm,
    selectedInvoicePo,
    invoicesForSelectedPo,
    outstandingForSelectedPo,
    totalOutstandingValue,
  };
}
