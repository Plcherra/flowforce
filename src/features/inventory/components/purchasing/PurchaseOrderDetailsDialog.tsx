import { useTranslation } from "react-i18next";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, formatDate } from "@/shared/utils";
import { STATUS_LABELS } from "../../utils/statusHelpers";
import type { PurchaseOrder } from "../../hooks/types";

interface PurchaseOrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  outstandingAmount: number;
}

export function PurchaseOrderDetailsDialog({
  open,
  onOpenChange,
  purchaseOrder,
  outstandingAmount,
}: PurchaseOrderDetailsDialogProps) {
  const { t } = useTranslation();
  if (!purchaseOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("inventory.purchaseOrderDetails")}</DialogTitle>
          <DialogDescription>
            {purchaseOrder.po_number} · {purchaseOrder.supplier_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{t("inventory.summary")}</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>{t("inventory.orderDate2")} {formatDate(purchaseOrder.order_date)}</p>
                <p>
                  {t("inventory.expectedDelivery2")}{" "}
                  {formatDate(purchaseOrder.expected_delivery_date)}
                </p>
                <p>
                  {t("inventory.actualDelivery")}{" "}
                  {formatDate(purchaseOrder.actual_delivery_date)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{t("inventory.financials")}</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>{t("inventory.total2")} {formatCurrency(purchaseOrder.total_amount)}</p>
                <p>{t("inventory.outstanding2")} {formatCurrency(outstandingAmount)}</p>
                <p>
                  {t("inventory.status")}{" "}
                  {STATUS_LABELS[purchaseOrder.status] ?? purchaseOrder.status}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-lg border">
            <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
              {t("inventory.lineItems")} </div>
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inventory.item")}</TableHead>
                    <TableHead className="w-[90px] text-right">
                      {t("inventory.quantity")} </TableHead>
                    <TableHead className="w-[90px] text-right">
                      {t("inventory.unitCost")} </TableHead>
                    <TableHead className="w-[100px] text-right">
                      {t("inventory.received")} </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.purchase_order_items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("inventory.lineValue")}{" "}
                            {formatCurrency(item.unit_price * item.quantity)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.received_quantity ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")} </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
