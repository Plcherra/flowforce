import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type {
  InventorySupplier,
  PurchaseOrder,
  SupplierIntegrationDetails,
} from "@/features/inventory/hooks/types";

const purchaseOrderSchema: z.ZodType<PurchaseOrder> = z
  .object({
    id: z.string(),
    po_number: z.string(),
    status: z.string(),
  })
  .passthrough() as unknown as z.ZodType<PurchaseOrder>;

const purchaseOrderArraySchema = z.array(purchaseOrderSchema);

export type PurchaseOrderItemInput = {
  item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
};

export type CreatePurchaseOrderInput = {
  supplier: Pick<
    InventorySupplier,
    | "id"
    | "name"
    | "contact_name"
    | "email"
    | "phone"
    | "address"
    | "payment_terms"
    | "integration"
  >;
  items: PurchaseOrderItemInput[];
  orderDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  currency?: string;
  poNumber?: string;
  status?: PurchaseOrder["status"];
  autoApprove?: boolean;
};

export type UpdatePurchaseOrderInput = Partial<
  Pick<
    PurchaseOrder,
    | "status"
    | "expected_delivery_date"
    | "notes"
    | "approved_by"
    | "actual_delivery_date"
    | "total_amount"
  >
>;

export type ReceivePurchaseOrderInput = {
  items: Array<{
    id: string;
    received_quantity: number;
    unit_price?: number;
  }>;
  actual_delivery_date?: string;
  notes?: string;
  closeOrder?: boolean;
  createTransactions?: boolean;
};

export type RecordVendorInvoiceInput = {
  poId: string;
  supplierName: string;
  amount: number;
  dueDate?: string;
  invoiceNumber?: string;
  notes?: string;
  paymentMethod?: string;
  attachments?: Record<string, unknown>[];
  status?: string;
};

export type SupplierIntegrationInput = SupplierIntegrationDetails & {
  api_key?: string;
};

interface PurchasingRepositoryOptions {
  supabaseClient?: SupabaseClient;
}

type PurchaseOrderLine = NonNullable<PurchaseOrder["purchase_order_items"]>[number];

type CanonicalPurchase = {
  id: string;
  company_id?: string | null;
};

type CanonicalPurchaseLine = {
  id: string;
  quantity_received?: number | null;
};

type PurchasableItem = {
  id: string;
  company_id?: string | null;
  default_location_id?: string | null;
  preferred_supplier_id?: string | null;
  cost_per_unit?: number | null;
};

export async function listPurchaseOrders(
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("purchase_orders")
    .select(
      `
      *,
      creator:profiles!created_by(first_name, last_name),
      approver:profiles!approved_by(first_name, last_name),
      purchase_order_items(*)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return purchaseOrderArraySchema.parse(data ?? []);
}

export async function getPurchaseOrder(
  poId: string,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("purchase_orders")
    .select(
      `
      *,
      creator:profiles!created_by(first_name, last_name),
      approver:profiles!approved_by(first_name, last_name),
      purchase_order_items(*)
    `,
    )
    .eq("id", poId)
    .maybeSingle();

  if (error) throw error;
  return data ? purchaseOrderSchema.parse(data) : null;
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderInput,
  options: PurchasingRepositoryOptions = {},
) {
  if (!payload.items?.length) {
    throw new Error("A purchase order requires at least one line item.");
  }

  const client = options.supabaseClient ?? supabase;
  const user = await getAuthUser(client);
  const companyId = await resolveActiveCompanyId(client);
  const totalAmount = payload.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const poNumber = payload.poNumber ?? generatePurchaseOrderNumber();
  const orderDate = payload.orderDate ?? new Date().toISOString().split("T")[0];
  const status = payload.status ?? "pending";
  const approvalStatus = payload.autoApprove ? "approved" : "pending";
  const approvedAt = payload.autoApprove ? new Date().toISOString() : null;
  const supplierContact = buildSupplierContact(payload.supplier);

  const { data: inserted, error } = await client
    .from("purchase_orders")
    .insert({
      company_id: companyId,
      po_number: poNumber,
      supplier_name: payload.supplier.name,
      supplier_contact: supplierContact,
      status,
      approval_status: approvalStatus,
      approved_at: approvedAt,
      order_date: orderDate,
      expected_delivery_date: payload.expectedDeliveryDate ?? null,
      total_amount: totalAmount,
      currency: payload.currency ?? "USD",
      notes: payload.notes ?? null,
      created_by: user.id,
      approved_by: payload.autoApprove ? user.id : null,
    })
    .select()
    .single();

  if (error) throw error;

  let insertedLines: PurchaseOrderLine[] = [];
  try {
    const poItems = payload.items.map((item) => ({
      company_id: companyId,
      poid: inserted.id,
      item_id: item.item_id ?? null,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      received_quantity: 0,
    }));

    const { data: lineData, error: itemsError } = await client
      .from("purchase_order_items")
      .insert(poItems)
      .select("*");
    if (itemsError) throw itemsError;
    insertedLines = purchaseOrderItemArray(lineData);

    await createCanonicalPurchaseOrder(
      client,
      {
        ...purchaseOrderSchema.parse(inserted),
        purchase_order_items: insertedLines,
      },
      payload,
      {
        companyId,
        userId: user.id,
        poNumber,
        orderDate,
        status,
        approvalStatus,
        approvedAt,
        totalAmount,
        supplierContact,
      },
    );
  } catch (orderError) {
    await client.from("purchase_order_items").delete().eq("poid", inserted.id);
    await client.from("purchase_orders").delete().eq("id", inserted.id);
    throw orderError;
  }

  return getPurchaseOrder(inserted.id, { supabaseClient: client });
}

export async function updatePurchaseOrder(
  poId: string,
  updates: UpdatePurchaseOrderInput,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const timestamp = new Date().toISOString();
  const canonicalUpdates: Record<string, unknown> = {
    updated_at: timestamp,
  };

  if (updates.status) {
    canonicalUpdates.status = updates.status;
    canonicalUpdates.approval_status =
      updates.status === "ordered"
        ? "approved"
        : updates.status === "cancelled"
          ? "cancelled"
          : undefined;
    canonicalUpdates.cancelled_at =
      updates.status === "cancelled" ? timestamp : undefined;
  }

  if (updates.expected_delivery_date !== undefined) {
    canonicalUpdates.expected_date = updates.expected_delivery_date;
  }

  if (updates.notes !== undefined) {
    canonicalUpdates.notes = updates.notes;
  }

  if (updates.approved_by !== undefined) {
    canonicalUpdates.approved_by = updates.approved_by;
    canonicalUpdates.approved_at = timestamp;
    canonicalUpdates.approval_status = "approved";
  }

  if (updates.actual_delivery_date !== undefined) {
    canonicalUpdates.received_date = updates.actual_delivery_date;
  }

  if (updates.total_amount !== undefined) {
    canonicalUpdates.total_amount = updates.total_amount;
  }

  const { data, error } = await client
    .from("purchase_orders")
    .update({
      ...updates,
      approval_status:
        updates.status === "ordered"
          ? "approved"
          : updates.status === "cancelled"
            ? "cancelled"
            : undefined,
      approved_at: updates.approved_by ? timestamp : undefined,
      cancelled_at: updates.status === "cancelled" ? timestamp : undefined,
      updated_at: timestamp,
    })
    .eq("id", poId)
    .select()
    .single();

  if (error) throw error;

  await client
    .from("inv_purchases")
    .update(cleanUndefined(canonicalUpdates))
    .eq("legacy_purchase_order_id", poId);

  return purchaseOrderSchema.parse(data);
}

export async function receivePurchaseOrder(
  poId: string,
  payload: ReceivePurchaseOrderInput,
  options: PurchasingRepositoryOptions = {},
) {
  if (!payload.items?.length) {
    throw new Error("No items provided for receiving.");
  }

  const client = options.supabaseClient ?? supabase;
  const purchaseOrder = await getPurchaseOrder(poId, {
    supabaseClient: client,
  });
  if (!purchaseOrder) throw new Error("Purchase order not found.");

  const user = await getAuthUser(client);
  const companyId =
    purchaseOrder.company_id ?? (await resolveActiveCompanyId(client));
  const supplierId = purchaseOrder.supplier_contact?.supplier_id ?? null;
  const canonicalPurchase = await ensureCanonicalPurchaseForLegacyOrder(
    client,
    purchaseOrder,
    {
      companyId,
      userId: user.id,
      supplierId,
    },
  );
  const canonicalLines = await ensureCanonicalPurchaseLines(
    client,
    canonicalPurchase.id,
    purchaseOrder,
    companyId,
  );
  const itemIds = purchaseOrder.purchase_order_items
    ?.map((line) => line.item_id)
    .filter((itemId): itemId is string => Boolean(itemId)) ?? [];
  const itemMap = await loadPurchasableItems(client, itemIds);
  const receiptDate =
    payload.actual_delivery_date ?? new Date().toISOString().split("T")[0];
  const receiptTimestamp = new Date().toISOString();

  for (const itemReceipt of payload.items) {
    const line = purchaseOrder.purchase_order_items?.find(
      (lineItem) => lineItem.id === itemReceipt.id,
    );
    if (!line) continue;

    const previousReceived = line.received_quantity ?? 0;
    const updatedReceived = Math.min(
      line.quantity,
      previousReceived + itemReceipt.received_quantity,
    );
    const quantityDelta = updatedReceived - previousReceived;
    if (quantityDelta <= 0) continue;
    const unitPrice = itemReceipt.unit_price ?? line.unit_price;
    const purchasableItem = line.item_id ? itemMap.get(line.item_id) : null;
    const canonicalLine = canonicalLines.get(line.id);

    const { error: updateError } = await client
      .from("purchase_order_items")
      .update({
        received_quantity: updatedReceived,
        total_price: line.unit_price * line.quantity,
        received_at: receiptTimestamp,
      })
      .eq("id", line.id)
      .select("id")
      .single();
    if (updateError) throw updateError;

    let stockLotId: string | null = null;
    if (line.item_id) {
      const { data: stockLot, error: lotError } = await client
        .from("inv_stock_lots")
        .insert({
          company_id: companyId,
          item_id: line.item_id,
          location_id: purchasableItem?.default_location_id ?? null,
          supplier_id: supplierId,
          purchaseid: canonicalPurchase.id,
          purchase_lineid: canonicalLine?.id ?? null,
          lot_number: buildPurchaseLotNumber(purchaseOrder.po_number, line.id),
          quantity: quantityDelta,
          unit_cost: unitPrice,
          received_date: receiptDate,
          is_active: true,
        })
        .select("id")
        .single();
      if (lotError) throw lotError;
      stockLotId = stockLot.id as string;

      if (canonicalLine) {
        const { error: canonicalLineError } = await client
          .from("inv_purchase_lines")
          .update({
            quantity_received: updatedReceived,
            received_date: receiptDate,
            received_at: receiptTimestamp,
            status:
              updatedReceived >= line.quantity
                ? "received"
                : updatedReceived > 0
                  ? "partial"
                  : "ordered",
            stock_lotid: stockLotId,
            line_total: line.quantity * unitPrice,
          })
          .eq("id", canonicalLine.id);
        if (canonicalLineError) throw canonicalLineError;
      }

      const { error: adjustmentError } = await client
        .from("inv_adjustments")
        .insert({
          company_id: companyId,
          item_id: line.item_id,
          location_id: purchasableItem?.default_location_id ?? null,
          adjustment_type: "purchase_receipt",
          quantity: quantityDelta,
          reason: `purchase_receipt:${purchaseOrder.po_number}`,
          reference_number: canonicalPurchase.id,
          cost_impact: unitPrice * quantityDelta,
          adjusted_by: user.id,
          adjustment_date: receiptDate,
        });
      if (adjustmentError) throw adjustmentError;

      await updateItemCostBasis(client, line.item_id, {
        unitCost: unitPrice,
        supplierId,
      });
    }

    if (stockLotId) {
      const { error: legacyLineStockError } = await client
        .from("purchase_order_items")
        .update({ stock_lotid: stockLotId })
        .eq("id", line.id);
      if (legacyLineStockError) throw legacyLineStockError;
    }

    if ((payload.createTransactions ?? true) && line.item_id) {
      const { error: txnError } = await client
        .from("inventory_transactions")
        .insert({
          item_id: line.item_id,
          transaction_type: "purchase",
          quantity: quantityDelta,
          unit_price: unitPrice,
          total_amount: unitPrice ? unitPrice * quantityDelta : null,
          reference_number: purchaseOrder.po_number,
          notes: payload.notes ?? `Received via PO ${purchaseOrder.po_number}`,
          performed_by: user.id,
        });
      if (txnError) throw txnError;
    }
  }

  const refreshed = await getPurchaseOrder(poId, { supabaseClient: client });
  if (!refreshed)
    throw new Error("Unable to refresh purchase order after receiving.");

  const allReceived = refreshed.purchase_order_items?.every(
    (line) => (line.received_quantity ?? 0) >= line.quantity,
  );
  const anyReceived = refreshed.purchase_order_items?.some(
    (line) => (line.received_quantity ?? 0) > 0,
  );

  const nextStatus = payload.closeOrder
    ? "received"
    : allReceived
      ? "received"
      : anyReceived
        ? "partial"
        : refreshed.status;

  const { error: poUpdateError } = await client
    .from("purchase_orders")
    .update({
      status: nextStatus,
      actual_delivery_date:
        receiptDate ||
        (nextStatus === "received"
          ? new Date().toISOString().split("T")[0]
          : refreshed.actual_delivery_date),
      notes: payload.notes ?? refreshed.notes,
      updated_at: receiptTimestamp,
    })
    .eq("id", poId)
    .select("id")
    .single();
  if (poUpdateError) throw poUpdateError;

  const { error: canonicalUpdateError } = await client
    .from("inv_purchases")
    .update({
      status: nextStatus,
      received_date: nextStatus === "received" ? receiptDate : null,
      received_by: user.id,
      notes: payload.notes ?? refreshed.notes,
      updated_at: receiptTimestamp,
    })
    .eq("id", canonicalPurchase.id);
  if (canonicalUpdateError) throw canonicalUpdateError;

  return getPurchaseOrder(poId, { supabaseClient: client });
}

export async function linkSupplierIntegration(
  supplierId: string,
  integration: SupplierIntegrationInput,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;

  const { data: supplier, error } = await client
    .from("inv_suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();
  if (error) throw error;

  const baseAddress =
    supplier?.address &&
    typeof supplier.address === "object" &&
    !Array.isArray(supplier.address)
      ? (supplier.address as Record<string, unknown>)
      : {};

  const updatedAddress = {
    ...baseAddress,
    integration: {
      ...integration,
      last_synced_at: integration.last_synced_at ?? new Date().toISOString(),
    },
  };

  const { data: updated, error: updateError } = await client
    .from("inv_suppliers")
    .update({ address: updatedAddress })
    .eq("id", supplierId)
    .select()
    .single();
  if (updateError) throw updateError;

  return {
    ...(updated as InventorySupplier),
    integration: updatedAddress.integration as SupplierIntegrationDetails,
  };
}

export async function recordVendorInvoice(
  payload: RecordVendorInvoiceInput,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const purchaseOrder = await getPurchaseOrder(payload.poId, {
    supabaseClient: client,
  });
  if (!purchaseOrder)
    throw new Error("Purchase order not found for invoice logging.");

  const user = await getAuthUser(client);

  const referenceNumber = purchaseOrder.po_number;
  const description = payload.invoiceNumber
    ? `Invoice ${payload.invoiceNumber} for PO ${purchaseOrder.po_number}`
    : `Invoice for PO ${purchaseOrder.po_number}`;
  const combinedNotes = [
    payload.invoiceNumber ? `Invoice #${payload.invoiceNumber}` : null,
    payload.notes ?? null,
  ]
    .filter(Boolean)
    .join(" • ");

  const { data, error } = await client
    .from("payments")
    .insert({
      payment_type: "vendor",
      recipient_type: "vendor",
      recipientid: purchaseOrder.supplier_contact?.supplier_id ?? null,
      recipient_name: payload.supplierName,
      amount: payload.amount,
      currency: purchaseOrder.currency ?? "USD",
      payment_method: payload.paymentMethod ?? null,
      reference_number: referenceNumber,
      description,
      status: payload.status ?? "pending",
      due_date: payload.dueDate ?? purchaseOrder.expected_delivery_date ?? null,
      notes: combinedNotes || null,
      attachments: payload.attachments ?? [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listVendorInvoices(
  poNumber?: string,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;

  let query = client
    .from("payments")
    .select("*")
    .eq("payment_type", "vendor")
    .order("created_at", { ascending: false });

  if (poNumber) {
    query = query.eq("reference_number", poNumber);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function purchaseOrderItemArray(data: unknown): PurchaseOrderLine[] {
  return Array.isArray(data) ? (data as PurchaseOrderLine[]) : [];
}

async function createCanonicalPurchaseOrder(
  client: SupabaseClient,
  purchaseOrder: PurchaseOrder,
  payload: CreatePurchaseOrderInput,
  context: {
    companyId: string;
    userId: string;
    poNumber: string;
    orderDate: string;
    status: string;
    approvalStatus: string;
    approvedAt: string | null;
    totalAmount: number;
    supplierContact: ReturnType<typeof buildSupplierContact>;
  },
) {
  const { data: canonical, error } = await client
    .from("inv_purchases")
    .insert({
      company_id: context.companyId,
      legacy_purchase_order_id: purchaseOrder.id,
      supplier_id: payload.supplier.id,
      supplier_snapshot: context.supplierContact ?? {},
      po_number: context.poNumber,
      status: context.status,
      approval_status: context.approvalStatus,
      approved_by: payload.autoApprove ? context.userId : null,
      approved_at: context.approvedAt,
      order_date: context.orderDate,
      expected_date: payload.expectedDeliveryDate ?? null,
      subtotal: context.totalAmount,
      tax_amount: 0,
      total_amount: context.totalAmount,
      currency: payload.currency ?? "USD",
      notes: payload.notes ?? null,
      created_by: context.userId,
    })
    .select("id")
    .single();
  if (error) throw error;

  const canonicalPurchaseId = canonical.id as string;
  const canonicalLines = purchaseOrder.purchase_order_items?.map((line) => ({
    company_id: context.companyId,
    purchaseid: canonicalPurchaseId,
    legacy_purchase_order_item_id: line.id,
    item_id: line.item_id ?? null,
    quantity_ordered: line.quantity,
    quantity_received: line.received_quantity ?? 0,
    unit_cost: line.unit_price,
    line_total: line.quantity * line.unit_price,
    status: "ordered",
  }));

  if (canonicalLines?.length) {
    const { error: linesError } = await client
      .from("inv_purchase_lines")
      .insert(canonicalLines);
    if (linesError) throw linesError;
  }
}

async function ensureCanonicalPurchaseForLegacyOrder(
  client: SupabaseClient,
  purchaseOrder: PurchaseOrder,
  context: {
    companyId: string;
    userId: string;
    supplierId: string | null;
  },
): Promise<CanonicalPurchase> {
  const { data: existing, error: existingError } = await client
    .from("inv_purchases")
    .select("id, company_id")
    .eq("legacy_purchase_order_id", purchaseOrder.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing as CanonicalPurchase;

  const { data, error } = await client
    .from("inv_purchases")
    .insert({
      company_id: context.companyId,
      legacy_purchase_order_id: purchaseOrder.id,
      supplier_id: context.supplierId,
      supplier_snapshot: purchaseOrder.supplier_contact ?? {},
      po_number: purchaseOrder.po_number,
      status: purchaseOrder.status,
      approval_status:
        purchaseOrder.status === "ordered" ||
        purchaseOrder.status === "partial" ||
        purchaseOrder.status === "received"
          ? "approved"
          : purchaseOrder.status === "cancelled"
            ? "cancelled"
            : "pending",
      approved_by: purchaseOrder.approved_by ?? null,
      approved_at: purchaseOrder.approved_by ? new Date().toISOString() : null,
      order_date: purchaseOrder.order_date,
      expected_date: purchaseOrder.expected_delivery_date ?? null,
      received_date: purchaseOrder.actual_delivery_date ?? null,
      subtotal: purchaseOrder.total_amount ?? 0,
      tax_amount: 0,
      total_amount: purchaseOrder.total_amount ?? 0,
      currency: purchaseOrder.currency ?? "USD",
      notes: purchaseOrder.notes ?? null,
      created_by: purchaseOrder.created_by ?? context.userId,
    })
    .select("id, company_id")
    .single();
  if (error) throw error;
  return data as CanonicalPurchase;
}

async function ensureCanonicalPurchaseLines(
  client: SupabaseClient,
  canonicalPurchaseId: string,
  purchaseOrder: PurchaseOrder,
  companyId: string,
) {
  const lineIds =
    purchaseOrder.purchase_order_items?.map((line) => line.id) ?? [];
  if (!lineIds.length) return new Map<string, CanonicalPurchaseLine>();

  const { data: existing, error } = await client
    .from("inv_purchase_lines")
    .select("id, legacy_purchase_order_item_id, quantity_received")
    .in("legacy_purchase_order_item_id", lineIds);
  if (error) throw error;

  const existingByLegacyId = new Map<string, CanonicalPurchaseLine>();
  (existing ?? []).forEach((line) => {
    const legacyId = String(line.legacy_purchase_order_item_id ?? "");
    if (legacyId) existingByLegacyId.set(legacyId, line as CanonicalPurchaseLine);
  });

  const missing =
    purchaseOrder.purchase_order_items?.filter(
      (line) => !existingByLegacyId.has(line.id),
    ) ?? [];

  if (missing.length > 0) {
    const { data: inserted, error: insertError } = await client
      .from("inv_purchase_lines")
      .insert(
        missing.map((line) => ({
          company_id: companyId,
          purchaseid: canonicalPurchaseId,
          legacy_purchase_order_item_id: line.id,
          item_id: line.item_id ?? null,
          quantity_ordered: line.quantity,
          quantity_received: line.received_quantity ?? 0,
          unit_cost: line.unit_price,
          line_total: line.quantity * line.unit_price,
          status:
            (line.received_quantity ?? 0) >= line.quantity
              ? "received"
              : (line.received_quantity ?? 0) > 0
                ? "partial"
                : "ordered",
        })),
      )
      .select("id, legacy_purchase_order_item_id, quantity_received");
    if (insertError) throw insertError;

    (inserted ?? []).forEach((line) => {
      const legacyId = String(line.legacy_purchase_order_item_id ?? "");
      if (legacyId) {
        existingByLegacyId.set(legacyId, line as CanonicalPurchaseLine);
      }
    });
  }

  return existingByLegacyId;
}

async function loadPurchasableItems(client: SupabaseClient, itemIds: string[]) {
  const uniqueItemIds = Array.from(new Set(itemIds));
  const itemMap = new Map<string, PurchasableItem>();
  if (!uniqueItemIds.length) return itemMap;

  const { data, error } = await client
    .from("inv_items")
    .select("id, company_id, default_location_id, preferred_supplier_id, cost_per_unit")
    .in("id", uniqueItemIds);
  if (error) throw error;

  (data ?? []).forEach((item) => itemMap.set(item.id, item as PurchasableItem));
  return itemMap;
}

async function updateItemCostBasis(
  client: SupabaseClient,
  itemId: string,
  input: { unitCost: number; supplierId: string | null },
) {
  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) return;

  const updates: Record<string, unknown> = {
    cost_per_unit: input.unitCost,
    updated_at: new Date().toISOString(),
  };

  if (input.supplierId) {
    updates.preferred_supplier_id = input.supplierId;
  }

  const { error } = await client.from("inv_items").update(updates).eq("id", itemId);
  if (error) throw error;
}

async function resolveActiveCompanyId(client: SupabaseClient): Promise<string> {
  const { data: authData } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Unable to resolve authenticated user");

  const { data, error } = await client
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.company_id) throw new Error("Unable to resolve company context");
  return data.company_id;
}

function buildPurchaseLotNumber(poNumber: string, lineId: string) {
  return `${poNumber}-${lineId.slice(0, 8)}`;
}

function cleanUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function generatePurchaseOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `PO-${datePart}-${timePart}-${randomPart}`;
}

function buildSupplierContact(supplier: CreatePurchaseOrderInput["supplier"]) {
  if (!supplier) return null;
  return {
    supplier_id: supplier.id,
    contact_name: supplier.contact_name,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address || null,
    payment_terms: supplier.payment_terms,
    integration: supplier.integration ?? undefined,
  };
}

async function getAuthUser(client: SupabaseClient) {
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user) {
    throw new Error("You must be authenticated to perform this action.");
  }
  return user;
}
