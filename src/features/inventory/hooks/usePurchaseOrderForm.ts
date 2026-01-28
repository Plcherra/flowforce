import { useState, useMemo, useCallback } from "react";
import type { DraftLineItem } from "../types/purchasing";
import { createDraftLineItem } from "../types/purchasing";
import type { InventoryItem } from "../hooks/types";

interface UsePurchaseOrderFormProps {
  inventoryItems: InventoryItem[];
  itemsLoading: boolean;
}

export function usePurchaseOrderForm({
  inventoryItems,
  itemsLoading,
}: UsePurchaseOrderFormProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    createDraftLineItem(),
  ]);

  const handleLineItemSelect = useCallback(
    (lineId: string, itemId: string) => {
      const inventoryItem = inventoryItems.find((item) => item.id === itemId);
      setLineItems((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line;
          const unitPrice = inventoryItem?.cost_per_unit ?? line.unitPrice ?? 0;
          const quantity = line.quantity > 0 ? line.quantity : 1;
          return {
            ...line,
            itemId,
            itemName: inventoryItem?.name ?? line.itemName,
            category:
              inventoryItem?.category ??
              inventoryItem?.category_details?.name ??
              null,
            unitPrice,
            quantity,
            total: Number((unitPrice * quantity).toFixed(2)),
          };
        }),
      );
    },
    [inventoryItems],
  );

  const handleLineItemQuantity = useCallback(
    (lineId: string, value: string) => {
      const quantity = Math.max(Number(value) || 0, 0);
      setLineItems((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? {
                ...line,
                quantity,
                total: Number((quantity * line.unitPrice).toFixed(2)),
              }
            : line,
        ),
      );
    },
    [],
  );

  const handleLineItemPrice = useCallback((lineId: string, value: string) => {
    const unitPrice = Math.max(Number(value) || 0, 0);
    setLineItems((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              unitPrice,
              total: Number((unitPrice * line.quantity).toFixed(2)),
            }
          : line,
      ),
    );
  }, []);

  const handleLineItemName = useCallback((lineId: string, value: string) => {
    setLineItems((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, itemName: value } : line,
      ),
    );
  }, []);

  const handleRemoveLineItem = useCallback((lineId: string) => {
    setLineItems((prev) =>
      prev.length > 1 ? prev.filter((line) => line.id !== lineId) : prev,
    );
  }, []);

  const handleAddLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createDraftLineItem()]);
  }, []);

  const orderTotal = useMemo(
    () => lineItems.reduce((sum, line) => sum + (line.total || 0), 0),
    [lineItems],
  );

  const reset = useCallback(() => {
    setSelectedSupplierId("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setExpectedDate("");
    setOrderNotes("");
    setAutoApprove(false);
    setLineItems([createDraftLineItem()]);
  }, []);

  return {
    // State
    selectedSupplierId,
    setSelectedSupplierId,
    orderDate,
    setOrderDate,
    expectedDate,
    setExpectedDate,
    orderNotes,
    setOrderNotes,
    autoApprove,
    setAutoApprove,
    lineItems,
    orderTotal,
    // Handlers
    handleLineItemSelect,
    handleLineItemQuantity,
    handleLineItemPrice,
    handleLineItemName,
    handleRemoveLineItem,
    handleAddLineItem,
    reset,
  };
}
