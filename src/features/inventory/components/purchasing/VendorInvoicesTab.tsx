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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
  getStatusColor,
  getPaymentStatusVariant,
  STATUS_LABELS,
} from "../../utils/statusHelpers";
import { extractInvoiceNumber } from "../../types/purchasing";
import type { VendorInvoiceRecord } from "../../types/purchasing";
import type { PurchaseOrder } from "../../hooks/types";

interface VendorInvoicesTabProps {
  purchaseOrders: PurchaseOrder[];
  vendorInvoices: VendorInvoiceRecord[];
  invoicesLoading: boolean;
  ordersLoading: boolean;
  selectedInvoicePoId: string;
  onInvoicePoChange: (poId: string) => void;
  selectedInvoicePo: PurchaseOrder | null;
  outstandingForSelectedPo: number;
  invoicesForSelectedPo: VendorInvoiceRecord[];
  totalOutstandingValue: number;
  onLogInvoice: () => void;
  outstandingByPo: Map<string, number>;
}

export function VendorInvoicesTab({
  purchaseOrders,
  vendorInvoices,
  invoicesLoading,
  ordersLoading,
  selectedInvoicePoId,
  onInvoicePoChange,
  selectedInvoicePo,
  outstandingForSelectedPo,
  invoicesForSelectedPo,
  totalOutstandingValue,
  onLogInvoice,
  outstandingByPo,
}: VendorInvoicesTabProps) {
  const { t } = useTranslation();
  const openInvoices = vendorInvoices.filter(
    (invoice) => invoice.status === "pending" || invoice.status === "approved",
  ).length;

  const paidInvoices = vendorInvoices.filter(
    (invoice) => invoice.status === "paid",
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("inventory.vendorInvoices")} </CardTitle>
          <CardDescription>
            {t("inventory.trackInvoicesPaymentStatusAndOutstandingBalancesForEachPurchaseOrder")} </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-muted-foreground">
                    {t("inventory.purchaseOrder")} </Label>
                  <Select
                    value={selectedInvoicePoId}
                    onValueChange={onInvoicePoChange}
                    disabled={ordersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("inventory.selectPurchaseOrder")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number} · {po.supplier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={onLogInvoice}
                  disabled={!selectedInvoicePo}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("inventory.logInvoice")} </Button>
              </div>
              {selectedInvoicePo && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {selectedInvoicePo.po_number}
                    </span>
                    <Badge
                      variant={getStatusColor(selectedInvoicePo.status)}
                      className="gap-1"
                    >
                      {STATUS_LABELS[selectedInvoicePo.status] ??
                        selectedInvoicePo.status}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{t("inventory.ordered")}</span>
                    <span className="text-right">
                      {formatDate(selectedInvoicePo.order_date)}
                    </span>
                    <span>{t("inventory.expectedDelivery")}</span>
                    <span className="text-right">
                      {formatDate(selectedInvoicePo.expected_delivery_date)}
                    </span>
                    <span>{t("inventory.totalValue")}</span>
                    <span className="text-right">
                      {formatCurrency(selectedInvoicePo.total_amount)}
                    </span>
                    <span>{t("inventory.outstanding")}</span>
                    <span className="text-right">
                      {formatCurrency(outstandingForSelectedPo)}
                    </span>
                    <span>{t("inventory.invoicesLogged")}</span>
                    <span className="text-right">
                      {invoicesForSelectedPo.length}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="font-medium">{t("inventory.invoiceMetrics")}</p>
              <div className="flex items-center justify-between">
                <span>{t("inventory.totalInvoicesLogged")}</span>
                <span>{vendorInvoices.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("inventory.openInvoices")}</span>
                <span>{openInvoices}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("inventory.paidInvoices")}</span>
                <span>{paidInvoices}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <span>{t("inventory.totalOutstanding")}</span>
                <span>{formatCurrency(totalOutstandingValue)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <ScrollArea className="h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inventory.invoice")}</TableHead>
                    <TableHead>{t("inventory.po")}</TableHead>
                    <TableHead>{t("inventory.amount")}</TableHead>
                    <TableHead>{t("schedule.status")}</TableHead>
                    <TableHead>{t("inventory.due")}</TableHead>
                    <TableHead className="text-right">{t("inventory.logged")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="space-y-2 p-4">
                          {[...Array(3)].map((_, index) => (
                            <div
                              key={index}
                              className="h-10 animate-pulse rounded bg-muted/60"
                            />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : vendorInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        {t("inventory.noInvoicesRecordedYet")} </TableCell>
                    </TableRow>
                  ) : (
                    vendorInvoices.map((invoice: VendorInvoiceRecord) => {
                      const relatedPo = purchaseOrders.find(
                        (po) => po.po_number === invoice.reference_number,
                      );
                      const invoiceNumber = extractInvoiceNumber(
                        invoice.notes,
                        invoice.description,
                      );
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {invoiceNumber ??
                                  invoice.reference_number ??
                                  "Invoice"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.payment_method ??
                                  "Payment method not set"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {relatedPo?.po_number ?? invoice.reference_number}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getPaymentStatusVariant(invoice.status)}
                              className="capitalize"
                            >
                              {invoice.status ?? "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatDate(invoice.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
