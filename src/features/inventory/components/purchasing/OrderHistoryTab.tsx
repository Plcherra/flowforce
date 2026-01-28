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
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Purchase Order History
          </CardTitle>
          <CardDescription>
            Audit trail for every purchase order, including approvals,
            receiving, and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                Status
              </Label>
              <Select
                value={filter.status}
                onValueChange={(value) => onFilterChange({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
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
                Supplier
              </Label>
              <Select
                value={filter.supplier}
                onValueChange={(value) => onFilterChange({ supplier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
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
                Order date from
              </Label>
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
                Order date to
              </Label>
              <Input
                type="date"
                value={filter.to}
                onChange={(event) => onFilterChange({ to: event.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Search
              </Label>
              <Input
                placeholder="Search by PO number or supplier"
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
                    <TableHead>PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        No purchase orders match your filters.
                      </TableCell>
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
                              View
                            </Button>
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
