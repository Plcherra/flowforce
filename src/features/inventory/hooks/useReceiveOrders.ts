import { useState, useMemo, useCallback } from "react";
import type { PurchaseOrder } from "../hooks/types";

interface UseReceiveOrdersProps {
  purchaseOrders: PurchaseOrder[];
  outstandingByPo: Map<string, number>;
}

export function useReceiveOrders({
  purchaseOrders,
  outstandingByPo,
}: UseReceiveOrdersProps) {
  const [receivingSelection, setReceivingSelection] = useState<string | null>(
    null,
  );
  const [receivingLines, setReceivingLines] = useState<Record<string, number>>(
    {},
  );
  const [receivingNotes, setReceivingNotes] = useState<string>("");
  const [closeReceiving, setCloseReceiving] = useState<boolean>(false);

  const receivingCandidates = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          ["ordered", "partial"].includes(po.status) &&
          (outstandingByPo.get(po.id) ?? 0) > 0,
      ),
    [purchaseOrders, outstandingByPo],
  );

  const selectedReceivingPo = useMemo<PurchaseOrder | null>(
    () =>
      receivingSelection
        ? (purchaseOrders.find((po) => po.id === receivingSelection) ?? null)
        : null,
    [purchaseOrders, receivingSelection],
  );

  const handleReceivingLineChange = useCallback(
    (lineId: string, quantity: number) => {
      setReceivingLines((prev) => ({
        ...prev,
        [lineId]: quantity,
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    setReceivingSelection(null);
    setReceivingLines({});
    setReceivingNotes("");
    setCloseReceiving(false);
  }, []);

  return {
    receivingSelection,
    setReceivingSelection,
    receivingLines,
    receivingNotes,
    setReceivingNotes,
    closeReceiving,
    setCloseReceiving,
    receivingCandidates,
    selectedReceivingPo,
    handleReceivingLineChange,
    reset,
  };
}
