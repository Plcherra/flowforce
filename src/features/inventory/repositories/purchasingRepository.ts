// @ts-nocheck
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import type { InventorySupplier, PurchaseOrder, SupplierIntegrationDetails } from '@/features/inventory/hooks/types';

const purchaseOrderSchema: z.ZodType<PurchaseOrder> = z.object({
  id: z.string(),
  po_number: z.string(),
  status: z.string(),
}).passthrough();

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
    'id' | 'name' | 'contact_name' | 'email' | 'phone' | 'address' | 'payment_terms' | 'integration'
  >;
  items: PurchaseOrderItemInput[];
  orderDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  currency?: string;
  poNumber?: string;
  status?: PurchaseOrder['status'];
  autoApprove?: boolean;
};

export type UpdatePurchaseOrderInput = Partial<
  Pick<PurchaseOrder, 'status' | 'expected_delivery_date' | 'notes' | 'approved_by' | 'actual_delivery_date' | 'total_amount'>
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

export type SupplierIntegrationInput = SupplierIntegrationDetails & { api_key?: string };

interface PurchasingRepositoryOptions {
  supabaseClient?: SupabaseClient;
}

export async function listPurchaseOrders(options: PurchasingRepositoryOptions = {}) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from('purchase_orders')
    .select(`
      *,
      creator:profiles!created_by(first_name, last_name),
      approver:profiles!approved_by(first_name, last_name),
      purchase_order_items(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return purchaseOrderArraySchema.parse(data ?? []);
}

export async function getPurchaseOrder(poId: string, options: PurchasingRepositoryOptions = {}) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from('purchase_orders')
    .select(`
      *,
      creator:profiles!created_by(first_name, last_name),
      approver:profiles!approved_by(first_name, last_name),
      purchase_order_items(*)
    `)
    .eq('id', poId)
    .maybeSingle();

  if (error) throw error;
  return data ? purchaseOrderSchema.parse(data) : null;
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderInput,
  options: PurchasingRepositoryOptions = {},
) {
  if (!payload.items?.length) {
    throw new Error('A purchase order requires at least one line item.');
  }

  const client = options.supabaseClient ?? supabase;
  const user = await getAuthUser(client);
  const totalAmount = payload.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const { data: inserted, error } = await client
    .from('purchase_orders')
    .insert({
      po_number: payload.poNumber ?? generatePurchaseOrderNumber(),
      supplier_name: payload.supplier.name,
      supplier_contact: buildSupplierContact(payload.supplier),
      status: payload.status ?? 'pending',
      order_date: payload.orderDate ?? new Date().toISOString().split('T')[0],
      expected_delivery_date: payload.expectedDeliveryDate ?? null,
      total_amount: totalAmount,
      currency: payload.currency ?? 'USD',
      notes: payload.notes ?? null,
      created_by: user.id,
      approved_by: payload.autoApprove ? user.id : null,
    })
    .select()
    .single();

  if (error) throw error;

  if (payload.items.length) {
    const poItems = payload.items.map((item) => ({
      po_id: inserted.id,
      item_id: item.item_id ?? null,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      received_quantity: 0,
    }));

    const { error: itemsError } = await client.from('purchase_order_items').insert(poItems);
    if (itemsError) {
      await client.from('purchase_orders').delete().eq('id', inserted.id);
      throw itemsError;
    }
  }

  return getPurchaseOrder(inserted.id, { supabaseClient: client });
}

export async function updatePurchaseOrder(
  poId: string,
  updates: UpdatePurchaseOrderInput,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from('purchase_orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', poId)
    .select()
    .single();

  if (error) throw error;
  return purchaseOrderSchema.parse(data);
}

export async function receivePurchaseOrder(
  poId: string,
  payload: ReceivePurchaseOrderInput,
  options: PurchasingRepositoryOptions = {},
) {
  if (!payload.items?.length) {
    throw new Error('No items provided for receiving.');
  }

  const client = options.supabaseClient ?? supabase;
  const purchaseOrder = await getPurchaseOrder(poId, { supabaseClient: client });
  if (!purchaseOrder) throw new Error('Purchase order not found.');

  const user = await getAuthUser(client);

  for (const itemReceipt of payload.items) {
    const line = purchaseOrder.purchase_order_items?.find((lineItem) => lineItem.id === itemReceipt.id);
    if (!line) continue;

    const previousReceived = line.received_quantity ?? 0;
    const updatedReceived = Math.min(line.quantity, previousReceived + itemReceipt.received_quantity);

    const { error: updateError } = await client
      .from('purchase_order_items')
      .update({
        received_quantity: updatedReceived,
        total_price: line.unit_price * line.quantity,
      })
      .eq('id', line.id)
      .select('id')
      .single();
    if (updateError) throw updateError;

    const quantityDelta = updatedReceived - previousReceived;
    if ((payload.createTransactions ?? true) && quantityDelta > 0 && line.item_id) {
      const unitPrice = itemReceipt.unit_price ?? line.unit_price;
      const { error: txnError } = await client.from('inventory_transactions').insert({
        item_id: line.item_id,
        transaction_type: 'purchase',
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
  if (!refreshed) throw new Error('Unable to refresh purchase order after receiving.');

  const allReceived = refreshed.purchase_order_items?.every(
    (line) => (line.received_quantity ?? 0) >= line.quantity,
  );
  const anyReceived = refreshed.purchase_order_items?.some((line) => (line.received_quantity ?? 0) > 0);

  const nextStatus = payload.closeOrder
    ? 'received'
    : allReceived
    ? 'received'
    : anyReceived
    ? 'partial'
    : refreshed.status;

  const { error: poUpdateError } = await client
    .from('purchase_orders')
    .update({
      status: nextStatus,
      actual_delivery_date:
        payload.actual_delivery_date ||
        (nextStatus === 'received' ? new Date().toISOString().split('T')[0] : refreshed.actual_delivery_date),
      notes: payload.notes ?? refreshed.notes,
    })
    .eq('id', poId)
    .select('id')
    .single();
  if (poUpdateError) throw poUpdateError;

  return getPurchaseOrder(poId, { supabaseClient: client });
}

export async function linkSupplierIntegration(
  supplierId: string,
  integration: SupplierIntegrationInput,
  options: PurchasingRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;

  const { data: supplier, error } = await client.from('inv_suppliers').select('*').eq('id', supplierId).single();
  if (error) throw error;

  const baseAddress =
    supplier?.address && typeof supplier.address === 'object' && !Array.isArray(supplier.address)
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
    .from('inv_suppliers')
    .update({ address: updatedAddress })
    .eq('id', supplierId)
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
  const purchaseOrder = await getPurchaseOrder(payload.poId, { supabaseClient: client });
  if (!purchaseOrder) throw new Error('Purchase order not found for invoice logging.');

  const user = await getAuthUser(client);

  const referenceNumber = purchaseOrder.po_number;
  const description = payload.invoiceNumber
    ? `Invoice ${payload.invoiceNumber} for PO ${purchaseOrder.po_number}`
    : `Invoice for PO ${purchaseOrder.po_number}`;
  const combinedNotes = [payload.invoiceNumber ? `Invoice #${payload.invoiceNumber}` : null, payload.notes ?? null]
    .filter(Boolean)
    .join(' • ');

  const { data, error } = await client
    .from('payments')
    .insert({
      payment_type: 'vendor',
      recipient_type: 'vendor',
      recipient_id: purchaseOrder.supplier_contact?.supplier_id ?? null,
      recipient_name: payload.supplierName,
      amount: payload.amount,
      currency: purchaseOrder.currency ?? 'USD',
      payment_method: payload.paymentMethod ?? null,
      reference_number: referenceNumber,
      description,
      status: payload.status ?? 'pending',
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

export async function listVendorInvoices(poNumber?: string, options: PurchasingRepositoryOptions = {}) {
  const client = options.supabaseClient ?? supabase;

  let query = client
    .from('payments')
    .select('*')
    .eq('payment_type', 'vendor')
    .order('created_at', { ascending: false });

  if (poNumber) {
    query = query.eq('reference_number', poNumber);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function generatePurchaseOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
    now.getSeconds(),
  ).padStart(2, '0')}`;
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `PO-${datePart}-${timePart}-${randomPart}`;
}

function buildSupplierContact(supplier: CreatePurchaseOrderInput['supplier']) {
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
    throw new Error('You must be authenticated to perform this action.');
  }
  return user;
}
