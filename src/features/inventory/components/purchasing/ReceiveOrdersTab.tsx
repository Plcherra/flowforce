import { useTranslation } from "react-i18next";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
  getStatusColor,
  getStatusIcon,
  STATUS_LABELS,
} from "../../utils/statusHelpers";
import type { PurchaseOrder } from "../../hooks/types";

interface ReceiveOrdersTabProps {
  receivingCandidates: PurchaseOrder[];
  selectedReceivingPo: PurchaseOrder | null;
  receivingLines: Record<string, number>;
  receivingNotes: string;
  closeReceiving: boolean;
  outstandingByPo: Map<string, number>;
  onSelectPo: (poId: string) => void;
  onReceivingLineChange: (lineId: string, quantity: number) => void;
  onReceivingNotesChange: (notes: string) => void;
  onCloseReceivingChange: (value: boolean) => void;
  onReceive: () => void;
  isReceiving: boolean;
}

export function ReceiveOrdersTab({
  receivingCandidates,
  selectedReceivingPo,
  receivingLines,
  receivingNotes,
  closeReceiving,
  outstandingByPo,
  onSelectPo,
  onReceivingLineChange,
  onReceivingNotesChange,
  onCloseReceivingChange,
  onReceive,
  isReceiving,
}: ReceiveOrdersTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("inventory.receivingStation")} </CardTitle>
          <CardDescription>
            {t("inventory.logDeliveriesCaptureCostAdjustmentsAndUpdateOnHandInventory")} </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-3">
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                <div>
                  <p className="font-medium">{t("inventory.receivingQueue")}</p>
                  <p className="text-xs text-muted-foreground">
                    {receivingCandidates.length} {t("inventory.purchaseOrdersAwaitingReceiving")} </p>
                </div>
              </div>
              <ScrollArea className="h-[360px]">
                <div className="space-y-1 p-2">
                  {receivingCandidates.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      {t("inventory.noOpenPurchaseOrdersWithQuantityRemaining")} </div>
                  ) : (
                    receivingCandidates.map((po) => {
                      const StatusIcon = getStatusIcon(po.status);
                      const outstanding = outstandingByPo.get(po.id) ?? 0;
                      const isSelected = selectedReceivingPo?.id === po.id;
                      return (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() => onSelectPo(po.id)}
                          className={cn(
                            "w-full rounded-lg border p-4 text-left transition hover:border-primary",
                            isSelected && "border-primary shadow-sm",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{po.po_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {po.supplier_name} {t("inventory.expected2")}{" "}
                                {formatDate(po.expected_delivery_date)}
                              </p>
                            </div>
                            <Badge
                              variant={getStatusColor(po.status)}
                              className="gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {STATUS_LABELS[po.status] ?? po.status}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {po.purchase_order_items
                                ?.map((item) => item.quantity)
                                .reduce((sum, qty) => sum + (qty || 0), 0) ??
                                0}{" "}
                              {t("inventory.unitsOrdered")} </span>
                            <span>
                              {t("inventory.outstanding")} {formatCurrency(outstanding)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="space-y-4">
            {selectedReceivingPo ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      {selectedReceivingPo.po_number}
                    </h3>
                    <Badge
                      variant={getStatusColor(selectedReceivingPo.status)}
                      className="gap-1"
                    >
                      {(() => {
                        const StatusIcon = getStatusIcon(
                          selectedReceivingPo.status,
                        );
                        return <StatusIcon className="h-3 w-3" />;
                      })()}
                      {STATUS_LABELS[selectedReceivingPo.status] ??
                        selectedReceivingPo.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedReceivingPo.supplier_name} {t("inventory.ordered2")}{" "}
                    {formatDate(selectedReceivingPo.order_date)}
                  </p>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
                    {t("inventory.receiveLineItems")} </div>
                  <ScrollArea className="h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("inventory.item")}</TableHead>
                          <TableHead className="w-[80px] text-right">
                            {t("inventory.ordered")} </TableHead>
                          <TableHead className="w-[80px] text-right">
                            {t("inventory.received")} </TableHead>
                          <TableHead className="w-[80px] text-right">
                            {t("inventory.remaining")} </TableHead>
                          <TableHead className="w-[120px] text-right">
                            {t("inventory.receiveNow")} </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReceivingPo.purchase_order_items?.map(
                          (line) => {
                            const alreadyReceived = line.received_quantity ?? 0;
                            const remaining = Math.max(
                              line.quantity - alreadyReceived,
                              0,
                            );
                            return (
                              <TableRow key={line.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {line.item_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatCurrency(line.unit_price)} {t("inventory.perUnit")} </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {line.quantity}
                                </TableCell>
                                <TableCell className="text-right">
                                  {alreadyReceived}
                                </TableCell>
                                <TableCell className="text-right">
                                  {remaining}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={remaining}
                                    className="min-w-20"
                                    value={receivingLines[line.id] ?? 0}
                                    onChange={(event) => {
                                      const value = Math.min(
                                        Math.max(
                                          Number(event.target.value) || 0,
                                          0,
                                        ),
                                        remaining,
                                      );
                                      onReceivingLineChange(line.id, value);
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {t("inventory.closePurchaseOrderAfterReceiving")} </p>
                      <p className="text-xs text-muted-foreground">
                        {t("inventory.automaticallyMarksTheOrderAsReceivedAndTimestampsTheDelivery")} </p>
                    </div>
                    <Switch
                      checked={closeReceiving}
                      onCheckedChange={onCloseReceivingChange}
                      aria-label={t("inventory.closePurchaseOrderAfterReceiving")}
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <Label htmlFor="receiving-notes">{t("inventory.receivingNotes")}</Label>
                    <Textarea
                      id="receiving-notes"
                      value={receivingNotes}
                      onChange={(event) =>
                        onReceivingNotesChange(event.target.value)
                      }
                      placeholder={t("inventory.logAnyDiscrepanciesSubstitutionsOrCredits")}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t("inventory.outstandingBalance")}</span>
                    <span>
                      {formatCurrency(
                        outstandingByPo.get(selectedReceivingPo.id) ?? 0,
                      )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={onReceive}
                    disabled={isReceiving}
                  >
                    {isReceiving ? "Recording..." : "Record Receiving"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                {t("inventory.selectAPurchaseOrderFromTheQueueToRecordReceivingActivity")} </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
