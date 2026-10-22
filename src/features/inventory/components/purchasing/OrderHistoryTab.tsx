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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HistoryIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
  getStatusColor,
  getStatusIcon,
  STATUS_LABELS,
} from "../../utils/statusHelpers";
import type { PurchaseOrder } from "../../hooks/types";

interface OrderHistoryFilter {
  status: string;
  supplier: string;
  search: string;
  from: string;
  to: string;
}

interface OrderHistoryTabProps {
  purchaseOrders: PurchaseOrder[];
  filteredOrders: PurchaseOrder[];
  filter: OrderHistoryFilter;
  onFilterChange: (filter: Partial<OrderHistoryFilter>) => void;
  onViewOrder: (poId: string) => void;
  suppliers: string[];
}

export function OrderHistoryTab({
  purchaseOrders,
  filteredOrders,
  filter,
  onFilterChange,
  onViewOrder,
  suppliers,
}: OrderHistoryTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            {t("inventory.purchaseOrderHistory")} </CardTitle>
          <CardDescription>
            {t("inventory.auditTrailForEveryPurchaseOrderIncludingApprovalsReceivingAndInvoices")} </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                {t("schedule.status")} </Label>
              <Select
                value={filter.status}
                onValueChange={(value) => onFilterChange({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("schedule.allStatuses2")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("schedule.allStatuses2")}</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                {t("inventory.supplier")} </Label>
              <Select
                value={filter.supplier}
                onValueChange={(value) => onFilterChange({ supplier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("inventory.allSuppliers")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.allSuppliers")}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                {t("inventory.orderDateFrom")} </Label>
              <Input
                type="date"
                value={filter.from}
                onChange={(event) =>
                  onFilterChange({ from: event.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                {t("inventory.orderDateTo")} </Label>
              <Input
                type="date"
                value={filter.to}
                onChange={(event) => onFilterChange({ to: event.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">
                {t("nav.search")} </Label>
              <Input
                placeholder={t("inventory.searchByPoNumberOrSupplier")}
                value={filter.search}
                onChange={(event) =>
                  onFilterChange({ search: event.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inventory.po")}</TableHead>
                    <TableHead>{t("inventory.supplier")}</TableHead>
                    <TableHead>{t("inventory.ordered")}</TableHead>
                    <TableHead>{t("inventory.expected")}</TableHead>
                    <TableHead className="text-right">{t("inventory.total")}</TableHead>
                    <TableHead>{t("schedule.status")}</TableHead>
                    <TableHead className="text-right">{t("inventory.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        {t("inventory.noPurchaseOrdersMatchYourFilters")} </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((po) => {
                      const StatusIcon = getStatusIcon(po.status);
                      return (
                        <TableRow key={po.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium">
                            {po.po_number}
                          </TableCell>
                          <TableCell>{po.supplier_name}</TableCell>
                          <TableCell>{formatDate(po.order_date)}</TableCell>
                          <TableCell>
                            {formatDate(po.expected_delivery_date)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(po.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusColor(po.status)}
                              className="gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {STATUS_LABELS[po.status] ?? po.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewOrder(po.id)}
                            >
                              {t("tasks.view")} </Button>
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
