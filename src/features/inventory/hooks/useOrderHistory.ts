import { useState, useMemo, useCallback } from "react";
import type { PurchaseOrder } from "../hooks/types";

interface OrderHistoryFilter {
  status: string;
  supplier: string;
  search: string;
  from: string;
  to: string;
}

interface UseOrderHistoryProps {
  purchaseOrders: PurchaseOrder[];
}

export function useOrderHistory({ purchaseOrders }: UseOrderHistoryProps) {
  const [historyFilter, setHistoryFilter] = useState<OrderHistoryFilter>({
    status: "all",
    supplier: "all",
    search: "",
    from: "",
    to: "",
  });

  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);

  const filteredHistoryOrders = useMemo(() => {
    const statusFilter = historyFilter.status;
    const supplierFilter = historyFilter.supplier;
    const searchTerm = historyFilter.search.trim().toLowerCase();
    const fromDate = historyFilter.from ? new Date(historyFilter.from) : null;
    const toDate = historyFilter.to ? new Date(historyFilter.to) : null;

    return purchaseOrders.filter((po) => {
      if (statusFilter !== "all" && po.status !== statusFilter) return false;
      if (supplierFilter !== "all" && po.supplier_name !== supplierFilter)
        return false;
      if (searchTerm) {
        const matchesSearch =
          po.po_number.toLowerCase().includes(searchTerm) ||
          po.supplier_name.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }
      if (fromDate || toDate) {
        const orderDate = new Date(po.order_date);
        if (fromDate && orderDate < fromDate) return false;
        if (toDate && orderDate > toDate) return false;
      }
      return true;
    });
  }, [purchaseOrders, historyFilter]);

  const historyDetailPo = useMemo<PurchaseOrder | null>(
    () =>
      historyDetailId
        ? (purchaseOrders.find((po) => po.id === historyDetailId) ?? null)
        : null,
    [purchaseOrders, historyDetailId],
  );

  const suppliers = useMemo(
    () => Array.from(new Set(purchaseOrders.map((po) => po.supplier_name))),
    [purchaseOrders],
  );

  const updateFilter = useCallback((updates: Partial<OrderHistoryFilter>) => {
    setHistoryFilter((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    filter: historyFilter,
    updateFilter,
    filteredOrders: filteredHistoryOrders,
    historyDetailId,
    setHistoryDetailId,
    historyDetailPo,
    suppliers,
  };
}
