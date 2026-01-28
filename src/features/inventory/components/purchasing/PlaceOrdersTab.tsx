import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  HistoryIcon,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { PurchaseOrderLineItems } from "./PurchaseOrderLineItems";
import { PurchaseOrderSummary } from "./PurchaseOrderSummary";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
  getStatusColor,
  getStatusIcon,
  STATUS_LABELS,
} from "../../utils/statusHelpers";
import type { DraftLineItem } from "../../types/purchasing";
import type { PurchaseOrder, InventoryItem } from "../../hooks/types";

interface Supplier {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: Record<string, unknown> | string | null;
  payment_terms?: string | null;
  integration?: {
    provider: string;
    account_id?: string;
  } | null;
}

interface PlaceOrdersTabProps {
  // Form state
  selectedSupplierId: string;
  onSupplierChange: (id: string) => void;
  orderDate: string;
  onOrderDateChange: (date: string) => void;
  expectedDate: string;
  onExpectedDateChange: (date: string) => void;
  orderNotes: string;
  onOrderNotesChange: (notes: string) => void;
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  lineItems: DraftLineItem[];
  orderTotal: number;
  // Data
  suppliers: Supplier[];
  suppliersLoading: boolean;
  inventoryItems: InventoryItem[];
  itemsLoading: boolean;
  selectedSupplier: Supplier | null;
  selectedSupplierIntegration: Supplier["integration"];
  // Handlers
  onLineItemSelect: (lineId: string, itemId: string) => void;
  onLineItemQuantity: (lineId: string, value: string) => void;
  onLineItemPrice: (lineId: string, value: string) => void;
  onLineItemName: (lineId: string, value: string) => void;
  onRemoveLineItem: (lineId: string) => void;
  onAddLineItem: () => void;
  onLinkIntegration: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  // Pending orders
  pendingOrders: PurchaseOrder[];
  ordersLoading: boolean;
  onApproveOrder: (po: PurchaseOrder) => void;
  onCancelOrder: (po: PurchaseOrder) => void;
  onViewOrder: (poId: string) => void;
  isUpdating: boolean;
  outstandingByPo: Map<string, number>;
}

export function PlaceOrdersTab({
  selectedSupplierId,
  onSupplierChange,
  orderDate,
  onOrderDateChange,
  expectedDate,
  onExpectedDateChange,
  orderNotes,
  onOrderNotesChange,
  autoApprove,
  onAutoApproveChange,
  lineItems,
  orderTotal,
  suppliers,
  suppliersLoading,
  inventoryItems,
  itemsLoading,
  selectedSupplier,
  selectedSupplierIntegration,
  onLineItemSelect,
  onLineItemQuantity,
  onLineItemPrice,
  onLineItemName,
  onRemoveLineItem,
  onAddLineItem,
  onLinkIntegration,
  onSubmit,
  isSubmitting,
  pendingOrders,
  ordersLoading,
  onApproveOrder,
  onCancelOrder,
  onViewOrder,
  isUpdating,
  outstandingByPo,
}: PlaceOrdersTabProps) {
  const outstandingBalance = selectedSupplier
    ? pendingOrders
        .filter((po) => po.supplier_name === selectedSupplier.name)
        .reduce((sum, po) => sum + (outstandingByPo.get(po.id) ?? 0), 0)
    : undefined;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit}>
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Create Purchase Order
            </CardTitle>
            <CardDescription>
              Build a new purchase order using live catalog pricing from Items &
              Setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select
                      value={selectedSupplierId}
                      onValueChange={onSupplierChange}
                      disabled={suppliersLoading}
                    >
                      <SelectTrigger id="supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-date">Order Date</Label>
                    <Input
                      id="order-date"
                      type="date"
                      value={orderDate}
                      onChange={(event) =>
                        onOrderDateChange(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected-date">Expected Delivery</Label>
                    <Input
                      id="expected-date"
                      type="date"
                      value={expectedDate}
                      onChange={(event) =>
                        onExpectedDateChange(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Internal Notes</Label>
                    <Textarea
                      id="notes"
                      value={orderNotes}
                      rows={3}
                      onChange={(event) =>
                        onOrderNotesChange(event.target.value)
                      }
                      placeholder="Share ordering instructions, substitutions, or approval context."
                    />
                  </div>
                </div>

                <PurchaseOrderLineItems
                  lineItems={lineItems}
                  inventoryItems={inventoryItems}
                  itemsLoading={itemsLoading}
                  onLineItemSelect={onLineItemSelect}
                  onLineItemQuantity={onLineItemQuantity}
                  onLineItemPrice={onLineItemPrice}
                  onLineItemName={onLineItemName}
                  onRemoveLineItem={onRemoveLineItem}
                  onAddLineItem={onAddLineItem}
                />
              </div>

              <PurchaseOrderSummary
                selectedSupplier={selectedSupplier}
                selectedSupplierIntegration={selectedSupplierIntegration}
                lineItems={lineItems}
                orderTotal={orderTotal}
                autoApprove={autoApprove}
                onAutoApproveChange={onAutoApproveChange}
                onLinkIntegration={onLinkIntegration}
                outstandingBalance={outstandingBalance}
              />
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t bg-muted/20 py-4">
            <div className="text-sm text-muted-foreground">
              Need recurring orders? Create templates from the Order History
              tab.
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Purchase Order"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HistoryIcon className="h-4 w-4" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Approve and release draft purchase orders to vendors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ordersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="h-14 w-full animate-pulse rounded bg-muted/60"
                />
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No purchase orders are waiting for approval.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingOrders.map((po) => {
                const StatusIcon = getStatusIcon(po.status);
                return (
                  <div
                    key={po.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{po.po_number}</p>
                        <Badge
                          variant={getStatusColor(po.status)}
                          className="gap-1"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[po.status] ?? po.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {po.supplier_name} · Ordered {formatDate(po.order_date)}{" "}
                        · {formatCurrency(po.total_amount)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onViewOrder(po.id)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onApproveOrder(po)}
                        disabled={isUpdating}
                      >
                        Approve & Send
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onCancelOrder(po)}
                        disabled={isUpdating}
                        aria-label="Cancel purchase order"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
