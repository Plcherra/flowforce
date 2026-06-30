import { useMemo, useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Truck,
  Package,
  History as HistoryIcon,
  FileText,
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Link2,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import {
  useInventoryItems,
  useInventorySuppliers,
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useUpdatePurchaseOrder,
  useRecordVendorInvoice,
  useVendorInvoices as useVendorInvoicesQuery,
  useSupplierIntegrationLink,
} from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import {
  PlaceOrdersTab,
  ReceiveOrdersTab,
  OrderHistoryTab,
  VendorInvoicesTab,
  IntegrationDialog,
  VendorInvoiceDialog,
  PurchaseOrderDetailsDialog,
} from "./purchasing/index";
import { usePurchaseOrderForm } from "../hooks/usePurchaseOrderForm";
import { useReceiveOrders } from "../hooks/useReceiveOrders";
import { useOrderHistory } from "../hooks/useOrderHistory";
import { useVendorInvoices } from "../hooks/useVendorInvoices";
import { formatCurrency, formatDate } from "@/shared/utils";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  getPaymentStatusVariant,
  getStatusColor,
  getStatusIcon,
} from "../utils/statusHelpers";
import { extractInvoiceNumber } from "../types/purchasing";
import type {
  InventoryItem,
  PurchaseOrder,
  SupplierIntegrationDetails,
} from "../hooks/types";

type IntegrationFormState = {
  provider: SupplierIntegrationDetails["provider"];
  account_id: string;
  api_key: string;
  notes: string;
};

type VendorInvoiceRecord = {
  id: string;
  reference_number?: string | null;
  amount?: number | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  description?: string | null;
};

// Utilities and types are now imported from:
// - utils/formatting.ts (formatCurrency, formatDate)
// - utils/statusHelpers.ts (STATUS_LABELS, getPaymentStatusVariant)
// - types/purchasing.ts (extractInvoiceNumber, createDraftLineItem)

export default function InventoryPurchasingPage() {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { data: purchaseOrders = [], isLoading: ordersLoading } =
    usePurchaseOrders();
  const { data: inventoryItems = [], isLoading: itemsLoading } =
    useInventoryItems();
  const { data: suppliers = [], isLoading: suppliersLoading } =
    useInventorySuppliers(companyId);
  const { data: vendorInvoiceData = [], isLoading: invoicesLoading } =
    useVendorInvoicesQuery();

  const createOrder = useCreatePurchaseOrder();
  const receiveOrder = useReceivePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const recordInvoice = useRecordVendorInvoice();
  const linkIntegration = useSupplierIntegrationLink();

  const { toast } = useToast();
  const vendorInvoices = useMemo<VendorInvoiceRecord[]>(
    () => (vendorInvoiceData as VendorInvoiceRecord[]) ?? [],
    [vendorInvoiceData],
  );

  // Calculate outstandingByPo first (needed by hooks)
  const outstandingByPo = useMemo(() => {
    const map = new Map<string, number>();

    purchaseOrders.forEach((po) => {
      const invoicesForPo = vendorInvoices.filter(
        (invoice) => invoice.reference_number === po.po_number,
      );
      const paidTotal = invoicesForPo.reduce(
        (sum, invoice) => sum + (Number(invoice.amount) || 0),
        0,
      );
      const outstanding = Math.max((po.total_amount ?? 0) - paidTotal, 0);
      map.set(po.id, outstanding);
    });

    return map;
  }, [purchaseOrders, vendorInvoices]);

  // Use extracted hooks
  const purchaseOrderForm = usePurchaseOrderForm({
    inventoryItems,
    itemsLoading,
  });

  const receiveOrders = useReceiveOrders({
    purchaseOrders,
    outstandingByPo,
  });

  const orderHistory = useOrderHistory({
    purchaseOrders,
  });

  const vendorInvoicesHook = useVendorInvoices({
    purchaseOrders,
    vendorInvoices,
    outstandingByPo,
  });

  // Local state for supplier selection and integration
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [integrationSupplierId, setIntegrationSupplierId] = useState<
    string | null
  >(null);
  const [integrationForm, setIntegrationForm] = useState<IntegrationFormState>({
    provider: "marketman",
    account_id: "",
    api_key: "",
    notes: "",
  });

  const selectedSupplier = useMemo(
    () =>
      suppliers?.find(
        (supplierItem) => supplierItem.id === selectedSupplierId,
      ) ?? null,
    [suppliers, selectedSupplierId],
  );

  const selectedSupplierIntegration = useMemo(() => {
    if (!selectedSupplier) return null;
    if (selectedSupplier.integration) return selectedSupplier.integration;
    const address = selectedSupplier.address;
    if (
      address &&
      typeof address === "object" &&
      !Array.isArray(address) &&
      "integration" in address
    ) {
      return (address as Record<string, unknown>)
        .integration as SupplierIntegrationDetails;
    }
    return null;
  }, [selectedSupplier]);

  const pendingOrders = useMemo(
    () =>
      purchaseOrders.filter((po) => ["pending", "draft"].includes(po.status)),
    [purchaseOrders],
  );

  // Computed values from hooks
  const orderTotal = purchaseOrderForm.orderTotal;
  const filteredHistoryOrders = orderHistory.filteredOrders;
  const totalOutstandingValue = vendorInvoicesHook.totalOutstandingValue;

  // Additional computed values
  const openOrderCount = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.status !== "received" && po.status !== "cancelled",
      ).length,
    [purchaseOrders],
  );

  const pendingApprovalCount = pendingOrders.length;
  const supplierCount = suppliers?.length ?? 0;

  // Initialize invoice form with first PO if available
  useEffect(() => {
    if (!purchaseOrders.length) return;
    if (vendorInvoicesHook.invoiceForm.poid) return;

    const defaultPo = purchaseOrders[0];
    vendorInvoicesHook.updateInvoiceForm({
      poid: defaultPo.id,
      amount: (defaultPo.total_amount ?? 0).toFixed(2),
    });
  }, [purchaseOrders, vendorInvoicesHook]);

  // Use values from hooks
  const receivingCandidates = receiveOrders.receivingCandidates;
  const selectedReceivingPo = receiveOrders.selectedReceivingPo;
  const selectedInvoicePo = vendorInvoicesHook.selectedInvoicePo;
  const invoicesForSelectedPo = vendorInvoicesHook.invoicesForSelectedPo;
  const outstandingForSelectedPo = vendorInvoicesHook.outstandingForSelectedPo;

  // Use handlers from purchaseOrderForm hook
  const {
    handleLineItemSelect,
    handleLineItemQuantity,
    handleLineItemPrice,
    handleLineItemName,
    handleRemoveLineItem,
    handleAddLineItem,
  } = purchaseOrderForm;

  const handleCreateOrder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSupplier) {
      toast({
        title: "Supplier required",
        description: "Select a supplier before creating a purchase order.",
        variant: "destructive",
      });
      return;
    }

    const validLines = purchaseOrderForm.lineItems
      .map((line) => ({
        ...line,
        itemName: line.itemName.trim(),
      }))
      .filter((line) => line.itemName && line.quantity > 0);

    if (validLines.length === 0) {
      toast({
        title: "No line items",
        description: "Add at least one item with quantity greater than zero.",
        variant: "destructive",
      });
      return;
    }

    createOrder.mutate(
      {
        supplier: {
          id: selectedSupplier.id,
          name: selectedSupplier.name,
          contact_name: selectedSupplier.contact_name,
          email: selectedSupplier.email,
          phone: selectedSupplier.phone,
          address: selectedSupplier.address as
            | Record<string, unknown>
            | string
            | null,
          payment_terms: selectedSupplier.payment_terms,
          integration: selectedSupplierIntegration ?? undefined,
        },
        items: validLines.map((line) => ({
          item_id: line.itemId ?? undefined,
          item_name: line.itemName,
          quantity: line.quantity,
          unit_price: line.unitPrice,
        })),
        orderDate: purchaseOrderForm.orderDate,
        expectedDeliveryDate: purchaseOrderForm.expectedDate || undefined,
        notes: purchaseOrderForm.orderNotes || undefined,
        status: purchaseOrderForm.autoApprove ? "ordered" : "pending",
        autoApprove: purchaseOrderForm.autoApprove,
      },
      {
        onSuccess: () => {
          purchaseOrderForm.reset();
        },
      },
    );
  };

  const handleApproveOrder = (po: PurchaseOrder) => {
    updateOrder.mutate({
      id: po.id,
      updates: {
        status: "ordered",
        approved_by: profile?.id ?? undefined,
      },
    });
  };

  const handleMarkCancelled = (po: PurchaseOrder) => {
    updateOrder.mutate({
      id: po.id,
      updates: {
        status: "cancelled",
        notes: po.notes ?? undefined,
      },
    });
  };

  const handleReceive = () => {
    if (!selectedReceivingPo) return;

    const payloadItems =
      selectedReceivingPo.purchase_order_items
        ?.map((line) => {
          const requested = Number(receiveOrders.receivingLines[line.id] ?? 0);
          const alreadyReceived = line.received_quantity ?? 0;
          const remaining = Math.max(line.quantity - alreadyReceived, 0);
          const receiveNow = Math.min(Math.max(requested, 0), remaining);

          if (receiveNow <= 0) return null;
          return {
            id: line.id,
            received_quantity: receiveNow,
            unit_price: line.unit_price,
          };
        })
        .filter(Boolean) ?? [];

    if (!payloadItems.length) {
      toast({
        title: "Nothing to receive",
        description:
          "Enter at least one quantity above zero to record receiving.",
        variant: "destructive",
      });
      return;
    }

    receiveOrder.mutate({
      id: selectedReceivingPo.id,
      payload: {
        items: payloadItems,
        notes: receiveOrders.receivingNotes || undefined,
        closeOrder: receiveOrders.closeReceiving,
        actual_delivery_date: new Date().toISOString().split("T")[0],
      },
    });
  };

  const handleSubmitInvoice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInvoicePo) return;

    const amount = Number(vendorInvoicesHook.invoiceForm.amount);
    if (!amount || amount <= 0) {
      toast({
        title: "Amount required",
        description: "Enter an amount greater than zero for the invoice.",
        variant: "destructive",
      });
      return;
    }

    recordInvoice.mutate(
      {
        poId: selectedInvoicePo.id,
        supplierName: selectedInvoicePo.supplier_name,
        amount,
        dueDate: vendorInvoicesHook.invoiceForm.dueDate || undefined,
        invoiceNumber:
          vendorInvoicesHook.invoiceForm.invoiceNumber || undefined,
        notes: vendorInvoicesHook.invoiceForm.notes || undefined,
        paymentMethod:
          vendorInvoicesHook.invoiceForm.paymentMethod || undefined,
      },
      {
        onSuccess: () => {
          vendorInvoicesHook.setInvoiceDialogOpen(false);
          vendorInvoicesHook.updateInvoiceForm({
            invoiceNumber: "",
            notes: "",
            amount: outstandingForSelectedPo
              ? outstandingForSelectedPo.toFixed(2)
              : (selectedInvoicePo.total_amount ?? 0).toFixed(2),
          });
        },
      },
    );
  };

  const handleLinkIntegration = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!integrationSupplierId) return;

    linkIntegration.mutate(
      {
        supplierId: integrationSupplierId,
        integration: {
          provider: integrationForm.provider,
          account_id: integrationForm.account_id || undefined,
          api_key: integrationForm.api_key || undefined,
          status: "connected",
          sync_notes: integrationForm.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setIntegrationDialogOpen(false);
          setIntegrationForm({
            provider: "marketman",
            account_id: "",
            api_key: "",
            notes: "",
          });
        },
      },
    );
  };

  // historyDetailPo is now provided by orderHistory hook

  return (
    <InventoryLayout>
      <IfCan permission="inventory.purchasing.view">
        <TooltipProvider delayDuration={150}>
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                  <ShoppingCart className="h-8 w-8" />
                  Inventory Purchasing
                </h1>
                <p className="text-muted-foreground">
                  Place purchase orders, reconcile deliveries, and track vendor
                  invoices in one workspace.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    receiveOrders.setReceivingSelection(
                      receivingCandidates[0]?.id ?? null,
                    )
                  }
                  disabled={!receivingCandidates.length}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Quick Receive
                </Button>
                <Button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Purchase Order
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Open Purchase Orders</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    {openOrderCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Awaiting completion or receiving.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Approvals</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    {pendingApprovalCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Purchase orders waiting for manager approval.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Outstanding Spend</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    {formatCurrency(totalOutstandingValue)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Un-invoiced or unpaid purchase order balance.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Integrated Suppliers</CardDescription>
                  <CardTitle className="text-3xl font-bold">
                    {suppliers?.filter((supplier) => supplier.integration)
                      ?.length ?? 0}{" "}
                    / {supplierCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Vendors with live API or EDI connections.
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="place" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                <TabsTrigger value="place" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Place Orders
                </TabsTrigger>
                <TabsTrigger
                  value="receive"
                  className="flex items-center gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Receive Orders
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2"
                >
                  <HistoryIcon className="h-4 w-4" />
                  Order History
                </TabsTrigger>
                <TabsTrigger
                  value="invoices"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Invoices
                </TabsTrigger>
              </TabsList>

              <TabsContent value="place" className="space-y-6">
                <PlaceOrdersTab
                  selectedSupplierId={selectedSupplierId}
                  onSupplierChange={setSelectedSupplierId}
                  orderDate={purchaseOrderForm.orderDate}
                  onOrderDateChange={purchaseOrderForm.setOrderDate}
                  expectedDate={purchaseOrderForm.expectedDate}
                  onExpectedDateChange={purchaseOrderForm.setExpectedDate}
                  orderNotes={purchaseOrderForm.orderNotes}
                  onOrderNotesChange={purchaseOrderForm.setOrderNotes}
                  autoApprove={purchaseOrderForm.autoApprove}
                  onAutoApproveChange={purchaseOrderForm.setAutoApprove}
                  lineItems={purchaseOrderForm.lineItems}
                  orderTotal={orderTotal}
                  suppliers={suppliers}
                  suppliersLoading={suppliersLoading}
                  inventoryItems={inventoryItems}
                  itemsLoading={itemsLoading}
                  selectedSupplier={selectedSupplier}
                  selectedSupplierIntegration={selectedSupplierIntegration}
                  onLineItemSelect={handleLineItemSelect}
                  onLineItemQuantity={handleLineItemQuantity}
                  onLineItemPrice={handleLineItemPrice}
                  onLineItemName={handleLineItemName}
                  onRemoveLineItem={handleRemoveLineItem}
                  onAddLineItem={handleAddLineItem}
                  onLinkIntegration={() => {
                    setIntegrationSupplierId(selectedSupplier?.id ?? null);
                    setIntegrationForm((prev) => ({
                      ...prev,
                      provider:
                        selectedSupplierIntegration?.provider ?? prev.provider,
                      account_id: selectedSupplierIntegration?.account_id ?? "",
                      api_key: "",
                      notes: selectedSupplierIntegration?.sync_notes ?? "",
                    }));
                    setIntegrationDialogOpen(true);
                  }}
                  onSubmit={handleCreateOrder}
                  isSubmitting={createOrder.isPending}
                  pendingOrders={pendingOrders}
                  ordersLoading={ordersLoading}
                  onApproveOrder={handleApproveOrder}
                  onCancelOrder={handleMarkCancelled}
                  onViewOrder={orderHistory.setHistoryDetailId}
                  isUpdating={updateOrder.isPending}
                  outstandingByPo={outstandingByPo}
                />
              </TabsContent>

              <TabsContent value="place-old" className="space-y-6 hidden">
                <form onSubmit={handleCreateOrder}>
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Create Purchase Order
                      </CardTitle>
                      <CardDescription>
                        Build a new purchase order using live catalog pricing
                        from Items &amp; Setup.
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
                                onValueChange={setSelectedSupplierId}
                                disabled={suppliersLoading}
                              >
                                <SelectTrigger id="supplier">
                                  <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                  {suppliers.map((supplier) => (
                                    <SelectItem
                                      key={supplier.id}
                                      value={supplier.id}
                                    >
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
                                value={purchaseOrderForm.orderDate}
                                onChange={(event) =>
                                  purchaseOrderForm.setOrderDate(
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expected-date">
                                Expected Delivery
                              </Label>
                              <Input
                                id="expected-date"
                                type="date"
                                value={purchaseOrderForm.expectedDate}
                                onChange={(event) =>
                                  purchaseOrderForm.setExpectedDate(
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="notes">Internal Notes</Label>
                              <Textarea
                                id="notes"
                                value={purchaseOrderForm.orderNotes}
                                rows={3}
                                onChange={(event) =>
                                  purchaseOrderForm.setOrderNotes(
                                    event.target.value,
                                  )
                                }
                                placeholder="Share ordering instructions, substitutions, or approval context."
                              />
                            </div>
                          </div>

                          <div className="space-y-3 rounded-lg border">
                            <div className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="font-medium">Line Items</p>
                                <p className="text-sm text-muted-foreground">
                                  Search items from Items &amp; Setup to inherit
                                  category and pricing.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  purchaseOrderForm.handleAddLineItem()
                                }
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Item
                              </Button>
                            </div>
                            <ScrollArea className="h-auto max-h-[420px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="w-[110px]">
                                      Quantity
                                    </TableHead>
                                    <TableHead className="w-[140px]">
                                      Unit Cost
                                    </TableHead>
                                    <TableHead className="w-[120px] text-right">
                                      Line Total
                                    </TableHead>
                                    <TableHead className="w-[44px]" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {purchaseOrderForm.lineItems.map((line) => (
                                    <TableRow key={line.id}>
                                      <TableCell>
                                        <div className="space-y-2">
                                          <Select
                                            value={line.itemId ?? ""}
                                            onValueChange={(value) =>
                                              handleLineItemSelect(
                                                line.id,
                                                value,
                                              )
                                            }
                                            disabled={itemsLoading}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Search items" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-80">
                                              {inventoryItems.map(
                                                (item: InventoryItem) => (
                                                  <SelectItem
                                                    key={item.id}
                                                    value={item.id}
                                                  >
                                                    <div className="flex flex-col text-left">
                                                      <span>{item.name}</span>
                                                      <span className="text-xs text-muted-foreground">
                                                        {item.category ||
                                                          "Uncategorized"}{" "}
                                                        ·{" "}
                                                        {item.cost_per_unit
                                                          ? formatCurrency(
                                                              item.cost_per_unit,
                                                            )
                                                          : "No cost set"}
                                                      </span>
                                                    </div>
                                                  </SelectItem>
                                                ),
                                              )}
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            value={line.itemName}
                                            onChange={(event) =>
                                              handleLineItemName(
                                                line.id,
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Custom item name"
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="0"
                                          className="min-w-20"
                                          value={line.quantity}
                                          onChange={(event) =>
                                            handleLineItemQuantity(
                                              line.id,
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="min-w-24"
                                          value={line.unitPrice}
                                          onChange={(event) =>
                                            handleLineItemPrice(
                                              line.id,
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(
                                          line.total,
                                          selectedSupplierIntegration?.provider ===
                                            "us_foods"
                                            ? "USD"
                                            : "USD",
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            handleRemoveLineItem(line.id)
                                          }
                                          disabled={
                                            purchaseOrderForm.lineItems
                                              .length === 1
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <BadgeCheck className="h-4 w-4" />
                                Supplier Snapshot
                              </CardTitle>
                              <CardDescription>
                                Contact and integration details from Items &amp;
                                Setup.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                              {selectedSupplier ? (
                                <>
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {selectedSupplier.name}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {selectedSupplier.contact_name ||
                                        "No contact on file"}
                                    </p>
                                  </div>
                                  <div className="space-y-1 text-muted-foreground">
                                    <p>
                                      {selectedSupplier.email ||
                                        "No email provided"}
                                    </p>
                                    <p>
                                      {selectedSupplier.phone ||
                                        "No phone provided"}
                                    </p>
                                  </div>
                                  <Separator />
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">
                                        Integration Status
                                      </span>
                                      {selectedSupplierIntegration ? (
                                        <Badge
                                          variant="default"
                                          className="gap-1"
                                        >
                                          <Link2 className="h-3 w-3" />
                                          Connected (
                                          {selectedSupplierIntegration.provider}
                                          )
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="gap-1"
                                        >
                                          <Link2 className="h-3 w-3" />
                                          Not linked
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setIntegrationSupplierId(
                                          selectedSupplier.id,
                                        );
                                        setIntegrationForm((prev) => ({
                                          ...prev,
                                          provider:
                                            selectedSupplierIntegration?.provider ??
                                            prev.provider,
                                          account_id:
                                            selectedSupplierIntegration?.account_id ??
                                            "",
                                          api_key: "",
                                          notes:
                                            selectedSupplierIntegration?.sync_notes ??
                                            "",
                                        }));
                                        setIntegrationDialogOpen(true);
                                      }}
                                    >
                                      <Link2 className="mr-2 h-4 w-4" />
                                      Link Integration
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Select a supplier to view contact and
                                  integration details.
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-4 w-4" />
                                Order Summary
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span>Line Items</span>
                                <span className="font-medium">
                                  {purchaseOrderForm.lineItems.length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Estimated Total</span>
                                <span className="font-medium">
                                  {formatCurrency(
                                    orderTotal,
                                    selectedSupplierIntegration?.provider ===
                                      "us_foods"
                                      ? "USD"
                                      : "USD",
                                  )}
                                </span>
                              </div>
                              {selectedSupplier && (
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span>Open Balance with Supplier</span>
                                  <span>
                                    {formatCurrency(
                                      purchaseOrders
                                        .filter(
                                          (po) =>
                                            po.supplier_name ===
                                            selectedSupplier.name,
                                        )
                                        .reduce(
                                          (sum, po) =>
                                            sum +
                                            (outstandingByPo.get(po.id) ?? 0),
                                          0,
                                        ),
                                    )}
                                  </span>
                                </div>
                              )}
                              <Separator />
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  Auto-approve order
                                </span>
                                <Switch
                                  checked={purchaseOrderForm.autoApprove}
                                  onCheckedChange={
                                    purchaseOrderForm.setAutoApprove
                                  }
                                  aria-label="Auto approve purchase order"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Enable to move this purchase order directly to{" "}
                                <strong>Ordered</strong> without manager
                                approval.
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t bg-muted/20 py-4">
                      <div className="text-sm text-muted-foreground">
                        Need recurring orders? Create templates from the Order
                        History tab.
                      </div>
                      <Button type="submit" disabled={createOrder.isPending}>
                        {createOrder.isPending
                          ? "Saving..."
                          : "Create Purchase Order"}
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
                                  {po.supplier_name} · Ordered{" "}
                                  {formatDate(po.order_date)} ·{" "}
                                  {formatCurrency(po.total_amount)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    orderHistory.setHistoryDetailId(po.id)
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Review
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleApproveOrder(po)}
                                  disabled={updateOrder.isPending}
                                >
                                  Approve &amp; Send
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMarkCancelled(po)}
                                  disabled={updateOrder.isPending}
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
              </TabsContent>

              <TabsContent value="receive" className="space-y-6">
                <ReceiveOrdersTab
                  receivingCandidates={receivingCandidates}
                  selectedReceivingPo={selectedReceivingPo}
                  receivingLines={receiveOrders.receivingLines}
                  receivingNotes={receiveOrders.receivingNotes}
                  closeReceiving={receiveOrders.closeReceiving}
                  outstandingByPo={outstandingByPo}
                  onSelectPo={receiveOrders.setReceivingSelection}
                  onReceivingLineChange={
                    receiveOrders.handleReceivingLineChange
                  }
                  onReceivingNotesChange={receiveOrders.setReceivingNotes}
                  onCloseReceivingChange={receiveOrders.setCloseReceiving}
                  onReceive={handleReceive}
                  isReceiving={receiveOrder.isPending}
                />
              </TabsContent>

              <TabsContent value="receive-old" className="space-y-6 hidden">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Receiving Station
                    </CardTitle>
                    <CardDescription>
                      Log deliveries, capture cost adjustments, and update
                      on-hand inventory.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                    <div className="space-y-3">
                      <div className="rounded-lg border">
                        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                          <div>
                            <p className="font-medium">Receiving Queue</p>
                            <p className="text-xs text-muted-foreground">
                              {receivingCandidates.length} purchase orders
                              awaiting receiving.
                            </p>
                          </div>
                        </div>
                        <ScrollArea className="h-[360px]">
                          <div className="space-y-1 p-2">
                            {receivingCandidates.length === 0 ? (
                              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                                No open purchase orders with quantity remaining.
                              </div>
                            ) : (
                              receivingCandidates.map((po) => {
                                const StatusIcon = getStatusIcon(po.status);
                                const outstanding =
                                  outstandingByPo.get(po.id) ?? 0;
                                const isSelected =
                                  receiveOrders.receivingSelection === po.id;
                                return (
                                  <button
                                    key={po.id}
                                    type="button"
                                    onClick={() =>
                                      receiveOrders.setReceivingSelection(po.id)
                                    }
                                    className={cn(
                                      "w-full rounded-lg border p-4 text-left transition hover:border-primary",
                                      isSelected && "border-primary shadow-sm",
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">
                                          {po.po_number}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {po.supplier_name} · Expected{" "}
                                          {formatDate(
                                            po.expected_delivery_date,
                                          )}
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
                                          .reduce(
                                            (sum, qty) => sum + (qty || 0),
                                            0,
                                          ) ?? 0}{" "}
                                        units ordered
                                      </span>
                                      <span>
                                        Outstanding{" "}
                                        {formatCurrency(outstanding)}
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
                                variant={getStatusColor(
                                  selectedReceivingPo.status,
                                )}
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
                              {selectedReceivingPo.supplier_name} · Ordered{" "}
                              {formatDate(selectedReceivingPo.order_date)}
                            </p>
                          </div>

                          <div className="rounded-lg border">
                            <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
                              Receive Line Items
                            </div>
                            <ScrollArea className="h-[280px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="w-[80px] text-right">
                                      Ordered
                                    </TableHead>
                                    <TableHead className="w-[80px] text-right">
                                      Received
                                    </TableHead>
                                    <TableHead className="w-[80px] text-right">
                                      Remaining
                                    </TableHead>
                                    <TableHead className="w-[120px] text-right">
                                      Receive Now
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {selectedReceivingPo.purchase_order_items?.map(
                                    (line) => {
                                      const alreadyReceived =
                                        line.received_quantity ?? 0;
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
                                                {formatCurrency(
                                                  line.unit_price,
                                                )}{" "}
                                                per unit
                                              </p>
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
                                              value={
                                                receiveOrders.receivingLines[
                                                  line.id
                                                ] ?? 0
                                              }
                                              onChange={(event) => {
                                                const value = Math.min(
                                                  Math.max(
                                                    Number(
                                                      event.target.value,
                                                    ) || 0,
                                                    0,
                                                  ),
                                                  remaining,
                                                );
                                                receiveOrders.handleReceivingLineChange(
                                                  line.id,
                                                  value,
                                                );
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
                                  Close purchase order after receiving
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Automatically marks the order as received and
                                  timestamps the delivery.
                                </p>
                              </div>
                              <Switch
                                checked={receiveOrders.closeReceiving}
                                onCheckedChange={
                                  receiveOrders.setCloseReceiving
                                }
                                aria-label="Close purchase order after receiving"
                              />
                            </div>
                            <div className="space-y-1 text-sm">
                              <Label htmlFor="receiving-notes">
                                Receiving Notes
                              </Label>
                              <Textarea
                                id="receiving-notes"
                                value={receiveOrders.receivingNotes}
                                onChange={(event) =>
                                  receiveOrders.setReceivingNotes(
                                    event.target.value,
                                  )
                                }
                                placeholder="Log any discrepancies, substitutions, or credits."
                                rows={3}
                              />
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>Outstanding balance</span>
                              <span>
                                {formatCurrency(
                                  outstandingByPo.get(selectedReceivingPo.id) ??
                                    0,
                                )}
                              </span>
                            </div>
                            <Button
                              type="button"
                              className="w-full"
                              onClick={handleReceive}
                              disabled={receiveOrder.isPending}
                            >
                              {receiveOrder.isPending
                                ? "Recording..."
                                : "Record Receiving"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                          Select a purchase order from the queue to record
                          receiving activity.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <OrderHistoryTab
                  purchaseOrders={purchaseOrders}
                  filteredOrders={filteredHistoryOrders}
                  filter={orderHistory.filter}
                  onFilterChange={orderHistory.updateFilter}
                  onViewOrder={orderHistory.setHistoryDetailId}
                  suppliers={orderHistory.suppliers}
                />
              </TabsContent>

              <TabsContent value="history-old" className="space-y-6 hidden">
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
                          value={orderHistory.filter.status}
                          onValueChange={(value) =>
                            orderHistory.updateFilter({ status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {Object.entries(STATUS_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase text-muted-foreground">
                          Supplier
                        </Label>
                        <Select
                          value={orderHistory.filter.supplier}
                          onValueChange={(value) =>
                            orderHistory.updateFilter({ supplier: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All suppliers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All suppliers</SelectItem>
                            {orderHistory.suppliers.map((supplier) => (
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
                          value={orderHistory.filter.from}
                          onChange={(event) =>
                            orderHistory.updateFilter({
                              from: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase text-muted-foreground">
                          Order date to
                        </Label>
                        <Input
                          type="date"
                          value={orderHistory.filter.to}
                          onChange={(event) =>
                            orderHistory.updateFilter({
                              to: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs uppercase text-muted-foreground">
                          Search
                        </Label>
                        <Input
                          placeholder="Search by PO number or supplier"
                          value={orderHistory.filter.search}
                          onChange={(event) =>
                            orderHistory.updateFilter({
                              search: event.target.value,
                            })
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
                              <TableHead className="text-right">
                                Total
                              </TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredHistoryOrders.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="h-24 text-center text-sm text-muted-foreground"
                                >
                                  No purchase orders match your filters.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredHistoryOrders.map((po) => {
                                const StatusIcon = getStatusIcon(po.status);
                                return (
                                  <TableRow
                                    key={po.id}
                                    className="hover:bg-muted/40"
                                  >
                                    <TableCell className="font-medium">
                                      {po.po_number}
                                    </TableCell>
                                    <TableCell>{po.supplier_name}</TableCell>
                                    <TableCell>
                                      {formatDate(po.order_date)}
                                    </TableCell>
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
                                        onClick={() =>
                                          orderHistory.setHistoryDetailId(po.id)
                                        }
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
              </TabsContent>

              <TabsContent value="invoices" className="space-y-6">
                <VendorInvoicesTab
                  purchaseOrders={purchaseOrders}
                  vendorInvoices={vendorInvoices}
                  invoicesLoading={invoicesLoading}
                  ordersLoading={ordersLoading}
                  selectedInvoicePoId={vendorInvoicesHook.invoiceForm.poid}
                  onInvoicePoChange={(poId) => {
                    const targetPo = purchaseOrders.find(
                      (po) => po.id === poId,
                    );
                    vendorInvoicesHook.updateInvoiceForm({
                      poid: poId,
                      amount: targetPo
                        ? (
                            outstandingByPo.get(targetPo.id) ??
                            targetPo.total_amount ??
                            0
                          ).toFixed(2)
                        : vendorInvoicesHook.invoiceForm.amount,
                    });
                  }}
                  selectedInvoicePo={selectedInvoicePo}
                  outstandingForSelectedPo={outstandingForSelectedPo}
                  invoicesForSelectedPo={invoicesForSelectedPo}
                  totalOutstandingValue={
                    vendorInvoicesHook.totalOutstandingValue
                  }
                  onLogInvoice={() =>
                    vendorInvoicesHook.setInvoiceDialogOpen(true)
                  }
                  outstandingByPo={outstandingByPo}
                />
              </TabsContent>

              <TabsContent value="invoices-old" className="space-y-6 hidden">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Vendor Invoices
                    </CardTitle>
                    <CardDescription>
                      Track invoices, payment status, and outstanding balances
                      for each purchase order.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-muted-foreground">
                              Purchase Order
                            </Label>
                            <Select
                              value={vendorInvoicesHook.invoiceForm.poid}
                              onValueChange={(value) => {
                                const targetPo = purchaseOrders.find(
                                  (po) => po.id === value,
                                );
                                vendorInvoicesHook.updateInvoiceForm({
                                  poid: value,
                                  amount: targetPo
                                    ? (
                                        outstandingByPo.get(targetPo.id) ??
                                        targetPo.total_amount ??
                                        0
                                      ).toFixed(2)
                                    : vendorInvoicesHook.invoiceForm.amount,
                                });
                              }}
                              disabled={ordersLoading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select purchase order" />
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
                            onClick={() =>
                              vendorInvoicesHook.setInvoiceDialogOpen(true)
                            }
                            disabled={!selectedInvoicePo}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Log Invoice
                          </Button>
                        </div>
                        {selectedInvoicePo && (
                          <div className="rounded-md border bg-muted/40 p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {selectedInvoicePo.po_number}
                              </span>
                              <Badge
                                variant={getStatusColor(
                                  selectedInvoicePo.status,
                                )}
                                className="gap-1"
                              >
                                {STATUS_LABELS[selectedInvoicePo.status] ??
                                  selectedInvoicePo.status}
                              </Badge>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Ordered</span>
                              <span className="text-right">
                                {formatDate(selectedInvoicePo.order_date)}
                              </span>
                              <span>Expected Delivery</span>
                              <span className="text-right">
                                {formatDate(
                                  selectedInvoicePo.expected_delivery_date,
                                )}
                              </span>
                              <span>Total Value</span>
                              <span className="text-right">
                                {formatCurrency(selectedInvoicePo.total_amount)}
                              </span>
                              <span>Outstanding</span>
                              <span className="text-right">
                                {formatCurrency(outstandingForSelectedPo)}
                              </span>
                              <span>Invoices Logged</span>
                              <span className="text-right">
                                {invoicesForSelectedPo.length}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 rounded-lg border p-4 text-sm">
                        <p className="font-medium">Invoice Metrics</p>
                        <div className="flex items-center justify-between">
                          <span>Total invoices logged</span>
                          <span>{vendorInvoices.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Open invoices</span>
                          <span>
                            {
                              vendorInvoices.filter(
                                (invoice) =>
                                  invoice.status === "pending" ||
                                  invoice.status === "approved",
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Paid invoices</span>
                          <span>
                            {
                              vendorInvoices.filter(
                                (invoice) => invoice.status === "paid",
                              ).length
                            }
                          </span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between font-medium">
                          <span>Total outstanding</span>
                          <span>{formatCurrency(totalOutstandingValue)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      <ScrollArea className="h-[320px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice</TableHead>
                              <TableHead>PO</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due</TableHead>
                              <TableHead className="text-right">
                                Logged
                              </TableHead>
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
                            ) : (vendorInvoices?.length ?? 0) === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="h-24 text-center text-sm text-muted-foreground"
                                >
                                  No invoices recorded yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              vendorInvoices.map(
                                (invoice: VendorInvoiceRecord) => {
                                  const relatedPo = purchaseOrders.find(
                                    (po) =>
                                      po.po_number === invoice.reference_number,
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
                                        {relatedPo?.po_number ??
                                          invoice.reference_number}
                                      </TableCell>
                                      <TableCell>
                                        {formatCurrency(invoice.amount)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={getPaymentStatusVariant(
                                            invoice.status ?? "pending",
                                          )}
                                          className="capitalize"
                                        >
                                          {invoice.status ?? "pending"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {formatDate(invoice.due_date)}
                                      </TableCell>
                                      <TableCell className="text-right text-xs text-muted-foreground">
                                        {formatDate(invoice.created_at)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                },
                              )
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <PurchaseOrderDetailsDialog
            open={Boolean(orderHistory.historyDetailPo)}
            onOpenChange={(open) => {
              if (!open) orderHistory.setHistoryDetailId(null);
            }}
            purchaseOrder={orderHistory.historyDetailPo}
            outstandingAmount={
              orderHistory.historyDetailPo
                ? (outstandingByPo.get(orderHistory.historyDetailPo.id) ?? 0)
                : 0
            }
          />

          <VendorInvoiceDialog
            open={vendorInvoicesHook.invoiceDialogOpen}
            onOpenChange={vendorInvoicesHook.setInvoiceDialogOpen}
            form={vendorInvoicesHook.invoiceForm}
            onFormChange={vendorInvoicesHook.updateInvoiceForm}
            onSubmit={handleSubmitInvoice}
            isSubmitting={recordInvoice.isPending}
          />

          <IntegrationDialog
            open={integrationDialogOpen}
            onOpenChange={setIntegrationDialogOpen}
            form={integrationForm}
            onFormChange={(updates) =>
              setIntegrationForm((prev) => ({ ...prev, ...updates }))
            }
            onSubmit={handleLinkIntegration}
            isSubmitting={linkIntegration.isPending}
          />
        </TooltipProvider>
      </IfCan>
    </InventoryLayout>
  );
}
