import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  notifyTransferCreated,
  notifyTransferStatusChange,
} from "@/notifications/inventoryTransfers";
import type {
  InventoryTransfer,
  InventoryTransferItem,
  InventoryTransferStatus,
} from "@/features/inventory/hooks/types";

const TRANSFER_SELECT = `
  *,
  from_location:inv_locations!inv_transfers_from_location_id_fkey(id, name, location_type),
  to_location:inv_locations!inv_transfers_to_location_id_fkey(id, name, location_type),
  requester:profiles!inv_transfers_requested_by_fkey(id, first_name, last_name),
  fulfiller:profiles!inv_transfers_fulfiller_id_fkey(id, first_name, last_name),
  recipient:profiles!inv_transfers_recipient_id_fkey(id, first_name, last_name),
  items:inv_transfer_items(
    id,
    item_id,
    unit_id,
    quantity,
    cost_per_unit,
    total_cost,
    created_at,
    item:inv_items(id, name, unit_id, cost_per_unit),
    unit:inv_units(id, name, abbreviation)
  ),
  audit:inv_transfer_audit(
    id,
    action,
    old_status,
    new_status,
    note,
    actor_id,
    created_at,
    actor:profiles!inv_transfer_audit_actor_id_fkey(id, first_name, last_name)
  )
`;

const transferItemSchema = z.object({
  item_id: z.string(),
  unit_id: z.string(),
  quantity: z.number().min(0.01),
  cost_per_unit: z.number().nullable().optional(),
});

const createTransferPayloadSchema = z.object({
  company_id: z.string(),
  requested_by: z.string(),
  fulfiller_id: z.string(),
  recipient_id: z.string(),
  from_location_id: z.string(),
  to_location_id: z.string(),
  delivery_date: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  status_note: z.string().nullable().optional(),
  items: z.array(transferItemSchema).min(1),
});

const updateTransferStatusSchema = z.object({
  actor_id: z.string(),
  status: z.custom<InventoryTransferStatus>(),
  status_note: z.string().nullable().optional(),
});

export type CreateInventoryTransferPayload = z.infer<
  typeof createTransferPayloadSchema
>;
export type UpdateInventoryTransferStatusPayload = z.infer<
  typeof updateTransferStatusSchema
>;

interface TransferRepositoryOptions {
  supabaseClient?: SupabaseClient;
}

export async function listInventoryTransfers(
  companyId: string,
  options: TransferRepositoryOptions = {},
) {
  if (!companyId) {
    throw new Error("Company ID is required to list transfers.");
  }
  const client = options.supabaseClient ?? supabase;

  const { data, error } = await client
    .from("inv_transfers")
    .select(TRANSFER_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: true, foreignTable: "items" })
    .order("created_at", { ascending: false, foreignTable: "audit" });

  if (error) throw error;
  return (data ?? []) as InventoryTransfer[];
}

export async function getInventoryTransferById(
  id: string,
  options: TransferRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("inv_transfers")
    .select(TRANSFER_SELECT)
    .eq("id", id)
    .order("created_at", { ascending: true, foreignTable: "items" })
    .order("created_at", { ascending: false, foreignTable: "audit" })
    .maybeSingle();

  if (error) throw error;
  return (data as InventoryTransfer | null) ?? null;
}

export async function createInventoryTransfer(
  payload: CreateInventoryTransferPayload,
  options: TransferRepositoryOptions = {},
) {
  const body = createTransferPayloadSchema.parse(payload);
  const client = options.supabaseClient ?? supabase;

  await assertUserBelongsToCompany(client, body.requested_by, body.company_id);

  const { items, comments, status_note, delivery_date, ...rest } = body;

  const { data, error } = await client
    .from("inv_transfers")
    .insert({
      ...rest,
      delivery_date: delivery_date ?? null,
      comments: comments ?? null,
      status_note: status_note ?? comments ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  if (items?.length) {
    const formattedItems = items.map((item) => ({
      transfer_id: data.id,
      item_id: item.item_id,
      unit_id: item.unit_id,
      quantity: item.quantity,
      cost_per_unit: item.cost_per_unit ?? null,
    }));

    const { error: itemsError } = await client
      .from("inv_transfer_items")
      .insert(formattedItems);
    if (itemsError) {
      await client.from("inv_transfers").delete().eq("id", data.id);
      throw itemsError;
    }
  }

  await client.from("inv_transfer_audit").insert({
    transfer_id: data.id,
    action: "created",
    new_status: "requested",
    actor_id: body.requested_by,
    note: status_note ?? null,
  });

  const transfer = await getInventoryTransferById(data.id, {
    supabaseClient: client,
  });
  if (!transfer) {
    throw new Error("Transfer created but not found.");
  }

  await notifyTransferCreated({
    transferId: transfer.id,
    requestedBy: transfer.requested_by,
    fulfillerId: transfer.fulfiller_id,
    recipientId: transfer.recipient_id,
    fromLocationName: transfer.from_location?.name,
    toLocationName: transfer.to_location?.name,
    deliveryDate: transfer.delivery_date,
  });

  return transfer;
}

export async function updateInventoryTransferStatus(
  id: string,
  payload: UpdateInventoryTransferStatusPayload,
  options: TransferRepositoryOptions = {},
) {
  const body = updateTransferStatusSchema.parse(payload);
  const client = options.supabaseClient ?? supabase;

  const existing = await getInventoryTransferById(id, {
    supabaseClient: client,
  });
  if (!existing) {
    throw new Error("Transfer not found");
  }

  await assertUserBelongsToCompany(client, body.actor_id, existing.company_id);

  const updateData: Record<string, unknown> = {
    status: body.status,
  };
  if (typeof body.status_note !== "undefined") {
    updateData.status_note = body.status_note;
  }

  const nowIso = new Date().toISOString();
  if (body.status === "sent") updateData.sent_at = nowIso;
  if (body.status === "received") updateData.received_at = nowIso;
  if (body.status === "rejected") updateData.rejected_at = nowIso;

  const { error } = await client
    .from("inv_transfers")
    .update(updateData)
    .eq("id", id);
  if (error) throw error;

  await client.from("inv_transfer_audit").insert({
    transfer_id: id,
    action: "status_changed",
    old_status: existing.status,
    new_status: body.status,
    note: body.status_note ?? null,
    actor_id: body.actor_id,
  });

  const transfer = await getInventoryTransferById(id, {
    supabaseClient: client,
  });
  if (!transfer) {
    throw new Error("Transfer updated but not found");
  }

  await notifyTransferStatusChange({
    transferId: transfer.id,
    status: body.status,
    statusNote: body.status_note,
    actorId: body.actor_id,
    requestedBy: transfer.requested_by,
    fulfillerId: transfer.fulfiller_id,
    recipientId: transfer.recipient_id,
    fromLocationName: transfer.from_location?.name,
    toLocationName: transfer.to_location?.name,
    deliveryDate: transfer.delivery_date,
  });

  return transfer;
}

async function assertUserBelongsToCompany(
  client: SupabaseClient,
  userId: string,
  companyId: string,
) {
  const { data, error } = await client
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.company_id !== companyId) {
    throw new Error("User is not authorized for this transfer.");
  }
}
