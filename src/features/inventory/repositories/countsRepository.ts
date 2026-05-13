import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type {
  InventoryCount,
  InventoryCountLine,
  InventoryItem,
  InventoryItemUnit,
} from "@/features/inventory/hooks/types";
import { buildUnitMetaIndex, collectUnits } from "@/utils/inventoryUnits";

const inventoryCountSchema = z
  .object({
    id: z.string(),
    count_type: z.string(),
    status: z.string(),
    count_date: z.string(),
  })
  .passthrough();

const inventoryCountLineSchema = z
  .object({
    id: z.string(),
    count_id: z.string(),
    item_id: z.string(),
    counted_quantity: z.number(),
  })
  .passthrough();

const inventoryCountArraySchema = z.array(inventoryCountSchema);
const inventoryCountLineArraySchema = z.array(inventoryCountLineSchema);

export type CreateInventoryCountInput = {
  type: string;
  period?: string | null;
  locations: string[];
  categories?: string[];
  items?: Array<{ id: string; expectedQuantity?: number }>;
  scheduleDate: string;
  notes?: string;
  description?: string;
};

export type ReviewActionInput = {
  notes?: string;
};

interface CountRepositoryOptions {
  supabaseClient?: SupabaseClient;
  companyId?: string;
}

type ScopedCountItem = {
  item: Pick<
    InventoryItem,
    | "id"
    | "name"
    | "category"
    | "sku"
    | "default_location_id"
    | "unit_id"
    | "unit"
    | "unit_quantity"
  >;
  expectedQuantity: number;
  units: InventoryItemUnit[];
};

export async function listInventoryCounts(
  options: CountRepositoryOptions = {},
): Promise<InventoryCount[]> {
  const client = options.supabaseClient ?? supabase;

  const { data, error } = await client
    .from("inv_counts")
    .select(
      `
        *,
        locations:inv_count_locations (
          location:inv_locations (id, name, location_type)
        )
      `,
    )
    .order("count_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return inventoryCountArraySchema.parse(data ?? []).map((count) => ({
    ...count,
    locations: ((count.locations ?? []) as Array<Record<string, unknown>>)
      .map((entry: Record<string, unknown>) => entry?.location)
      .filter(Boolean),
  })) as InventoryCount[];
}

export async function getInventoryCount(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("inv_counts")
    .select(
      `
        *,
        locations:inv_count_locations (
          location:inv_locations (id, name, location_type)
        )
      `,
    )
    .eq("id", countId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const parsed = inventoryCountSchema.parse(data);
  return {
    ...parsed,
    locations: ((parsed.locations ?? []) as Array<Record<string, unknown>>)
      .map((entry: Record<string, unknown>) => entry?.location)
      .filter(Boolean),
  } as InventoryCount;
}

export async function createInventoryCount(
  payload: CreateInventoryCountInput,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const companyId = await resolveActiveCompanyId(client, options.companyId);
  const userId = await getCurrentUserId(client);

  const countDate = payload.scheduleDate
    ? new Date(payload.scheduleDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const { data: createdCount, error } = await client
    .from("inv_counts")
    .insert({
      count_type: payload.type,
      count_period: payload.period,
      count_date: countDate,
      location_id: payload.locations[0] || null,
      notes: payload.notes,
      description: payload.description,
      status: "planned",
      review_status: "pending",
      counted_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  const countId = createdCount.id as string;

  if (payload.locations.length > 0) {
    const locationPayload = payload.locations.map((locationId) => ({
      count_id: countId,
      location_id: locationId,
    }));
    const { error: locationError } = await client
      .from("inv_count_locations")
      .upsert(locationPayload, { onConflict: "count_id,location_id" });
    if (locationError) throw locationError;
  }

  const scopedItems = await resolveCountScopeItems(client, payload, companyId);
  if (scopedItems.length > 0) {
    await bootstrapCountLines(client, countId, scopedItems);
  }

  await logCountEvent(client, countId, "created", {
    type: payload.type,
    period: payload.period,
    location_count: payload.locations.length,
    item_count: scopedItems.length,
  });

  return getInventoryCount(countId, { supabaseClient: client });
}

export async function updateInventoryCount(
  countId: string,
  updates: Partial<InventoryCount>,
  options: CountRepositoryOptions & {
    eventType?: string;
    payload?: Record<string, unknown>;
  } = {},
) {
  if (!updates || Object.keys(updates).length === 0) {
    return;
  }
  const client = options.supabaseClient ?? supabase;

  const { error } = await client
    .from("inv_counts")
    .update(updates)
    .eq("id", countId);
  if (error) throw error;

  if (options.eventType) {
    await logCountEvent(client, countId, options.eventType, options.payload);
  }
}

export async function deleteInventoryCount(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;

  const { error: linesError } = await client
    .from("inv_count_lines")
    .delete()
    .eq("count_id", countId);
  if (linesError) throw linesError;

  const { error } = await client.from("inv_counts").delete().eq("id", countId);
  if (error) throw error;
}

export async function submitInventoryCount(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const timestamp = new Date().toISOString();

  const { error } = await client
    .from("inv_counts")
    .update({
      status: "awaiting_review",
      review_status: "under_review",
      submitted_at: timestamp,
    })
    .eq("id", countId);
  if (error) throw error;

  await logCountEvent(client, countId, "submitted", {
    submitted_at: timestamp,
  });
}

export async function approveInventoryCount(
  countId: string,
  input: ReviewActionInput = {},
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const reviewerId = await getCurrentUserId(client);
  const timestamp = new Date().toISOString();

  const { error } = await client
    .from("inv_counts")
    .update({
      status: "approved",
      review_status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: timestamp,
      review_notes: input.notes ?? null,
    })
    .eq("id", countId);
  if (error) throw error;

  await logCountEvent(client, countId, "approved", {
    reviewed_at: timestamp,
    notes: input.notes,
  });
}

export async function rejectInventoryCount(
  countId: string,
  input: ReviewActionInput = {},
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const reviewerId = await getCurrentUserId(client);
  const timestamp = new Date().toISOString();

  const { error } = await client
    .from("inv_counts")
    .update({
      status: "in_progress",
      review_status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: timestamp,
      review_notes: input.notes ?? null,
    })
    .eq("id", countId);
  if (error) throw error;

  await logCountEvent(client, countId, "rejected", {
    reviewed_at: timestamp,
    notes: input.notes,
  });
}

export async function completeInventoryCount(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const timestamp = new Date().toISOString();

  const { error } = await client
    .from("inv_counts")
    .update({
      status: "awaiting_review",
      review_status: "under_review",
      completed_at: timestamp,
      submitted_at: timestamp,
    })
    .eq("id", countId);
  if (error) throw error;

  await logCountEvent(client, countId, "submitted", {
    completed_at: timestamp,
  });
}

export async function listInventoryCountEvents(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("inv_count_events")
    .select(`*, actor:profiles(id, first_name, last_name)`)
    .eq("count_id", countId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listInventoryCountScans(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("inv_count_scans")
    .select("*")
    .eq("count_id", countId)
    .order("scanned_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function recordInventoryCountScan(
  countId: string,
  scannedCode: string,
  options: CountRepositoryOptions & {
    itemId?: string;
    scanType?: "barcode" | "qr_code";
    metadata?: Record<string, unknown>;
  } = {},
) {
  const client = options.supabaseClient ?? supabase;
  const userId = await getCurrentUserId(client);
  const { error } = await client.from("inv_count_scans").insert({
    count_id: countId,
    item_id: options.itemId ?? null,
    scanned_code: scannedCode,
    scan_type: options.scanType ?? "barcode",
    scanned_by: userId,
    metadata: options.metadata ?? {},
  });
  if (error) throw error;

  await logCountEvent(client, countId, "note_added", {
    action: "barcode_scanned",
    scanned_code: scannedCode,
    item_id: options.itemId,
    scan_type: options.scanType ?? "barcode",
  });
}

export async function listInventoryCountLines(
  countId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("inv_count_lines")
    .select(
      `
        *,
        item:inv_items(id, name, sku, category),
        unit:inv_units(id, name, abbreviation)
      `,
    )
    .eq("count_id", countId)
    .order("item_id", { ascending: true })
    .order("unit_level", { ascending: true });
  if (error) throw error;
  return inventoryCountLineArraySchema.parse(
    data ?? [],
  ) as InventoryCountLine[];
}

export async function addInventoryItemToCount(
  countId: string,
  itemId: string,
  expectedQuantity = 0,
  options: CountRepositoryOptions = {},
) {
  return addInventoryItemsToCount(
    countId,
    [{ id: itemId, expectedQuantity }],
    options,
  );
}

export async function addInventoryItemsToCount(
  countId: string,
  items: Array<{ id: string; expectedQuantity?: number }>,
  options: CountRepositoryOptions = {},
) {
  if (!items.length) return;
  const client = options.supabaseClient ?? supabase;
  const companyId = await resolveActiveCompanyId(client, options.companyId);
  const scopedItems = await buildScopedItemsForIds(client, items, companyId);
  if (!scopedItems.length) return;

  await bootstrapCountLines(client, countId, scopedItems);
  await logCountEvent(client, countId, "note_added", {
    action: "items_added",
    item_ids: scopedItems.map((entry) => entry.item.id),
  });
}

export async function updateInventoryCountLine(
  lineId: string,
  updates: Partial<InventoryCountLine>,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const payload: Partial<InventoryCountLine> & { counted_at?: string } = {
    ...updates,
  };
  if (updates.counted_quantity !== undefined) {
    payload.counted_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from("inv_count_lines")
    .update(payload)
    .eq("id", lineId)
    .select("count_id, item_id, unit_id, counted_quantity")
    .single();
  if (error) throw error;

  if (updates.counted_quantity !== undefined && data) {
    await logCountEvent(client, data.count_id, "item_counted", {
      item_id: data.item_id,
      unit_id: data.unit_id,
      counted_quantity: updates.counted_quantity,
    });
  }
}

export async function removeInventoryItemFromCount(
  lineId: string,
  options: CountRepositoryOptions = {},
) {
  const client = options.supabaseClient ?? supabase;
  const { data, error } = await client
    .from("inv_count_lines")
    .delete()
    .eq("id", lineId)
    .select("count_id, item_id, unit_id")
    .single();
  if (error) throw error;

  if (data) {
    await logCountEvent(client, data.count_id, "note_added", {
      action: "item_removed",
      item_id: data.item_id,
      unit_id: data.unit_id,
    });
  }
}

async function resolveActiveCompanyId(
  client: SupabaseClient,
  explicit?: string,
): Promise<string> {
  if (explicit) return explicit;
  const { data: authData } = await client.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("Unable to resolve authenticated user");

  const { data, error } = await client
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const companyId = data?.company_id;
  if (!companyId) throw new Error("Unable to resolve company context");
  return companyId;
}

async function getCurrentUserId(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Authenticated user required");
  }
  return userId;
}

async function logCountEvent(
  client: SupabaseClient,
  countId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  const actorId = await getCurrentUserId(client);
  const { error } = await client.from("inv_count_events").insert({
    count_id: countId,
    event_type: eventType,
    actor_id: actorId,
    payload,
  });
  if (error) throw error;
}

async function resolveCountScopeItems(
  client: SupabaseClient,
  countData: CreateInventoryCountInput,
  companyId: string,
): Promise<ScopedCountItem[]> {
  if (countData.items && countData.items.length > 0) {
    return buildScopedItemsForIds(
      client,
      countData.items.map((item) => ({
        id: item.id,
        expectedQuantity: item.expectedQuantity ?? 0,
      })),
      companyId,
    );
  }

  let itemQuery = client
    .from("inv_items")
    .select(
      `id, name, category, sku, default_location_id, unit_id, unit:inv_units(*)`,
    )
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (countData.locations.length > 0) {
    itemQuery = itemQuery.in("default_location_id", countData.locations);
  }

  if (countData.categories && countData.categories.length > 0) {
    itemQuery = itemQuery.in("category", countData.categories);
  }

  const { data, error } = await itemQuery;
  if (error) throw error;

  const items = (data ?? []) as unknown as InventoryItem[];
  const scoped = items.map((item) => ({
    item,
    expectedQuantity: 0,
    units: [],
  }));
  return attachUnitsToItems(client, scoped);
}

async function buildScopedItemsForIds(
  client: SupabaseClient,
  items: Array<{ id: string; expectedQuantity?: number }>,
  companyId: string,
): Promise<ScopedCountItem[]> {
  if (!items.length) return [];

  const { data, error } = await client
    .from("inv_items")
    .select(
      `id, name, category, sku, default_location_id, unit_id, unit:inv_units(*)`,
    )
    .in(
      "id",
      items.map((item) => item.id),
    )
    .eq("company_id", companyId)
    .eq("is_active", true);
  if (error) throw error;

  const expectedMap = new Map(
    items.map((entry) => [entry.id, entry.expectedQuantity ?? 0]),
  );
  const scoped = ((data ?? []) as unknown as InventoryItem[]).map<ScopedCountItem>(
    (item) => ({
      item,
      expectedQuantity: expectedMap.get(item.id) ?? 0,
      units: [],
    }),
  );

  return attachUnitsToItems(client, scoped);
}

async function attachUnitsToItems(
  client: SupabaseClient,
  scopedItems: ScopedCountItem[],
) {
  if (!scopedItems.length) return scopedItems;

  const itemIds = scopedItems.map((entry) => entry.item.id);
  const { data: unitsData, error } = await client
    .from("inv_item_units")
    .select(`*, unit:inv_units(*)`)
    .in("item_id", itemIds)
    .order("unit_level", { ascending: true });
  if (error) throw error;

  const unitsByItem = scopedItems.reduce<Record<string, InventoryItemUnit[]>>(
    (acc, entry) => {
      acc[entry.item.id] = [];
      return acc;
    },
    {},
  );

  (unitsData ?? []).forEach((unit) => {
    const typed = unit as unknown as InventoryItemUnit;
    if (typed.is_countable === false) return;
    const bucket = unitsByItem[typed.item_id] || [];
    bucket.push(typed);
    unitsByItem[typed.item_id] = bucket;
  });

  return scopedItems.map((entry) => ({
    ...entry,
    units: (unitsByItem[entry.item.id] || []).sort(
      (a, b) => (a.unit_level ?? 0) - (b.unit_level ?? 0),
    ),
  }));
}

async function bootstrapCountLines(
  client: SupabaseClient,
  countId: string,
  scopedItems: ScopedCountItem[],
) {
  if (!scopedItems.length) return;

  const { data: existingLines, error: existingError } = await client
    .from("inv_count_lines")
    .select("item_id, unit_id")
    .eq("count_id", countId);
  if (existingError) throw existingError;

  const existingKeys = new Set<string>(
    (existingLines ?? []).map(
      (line) => `${line.item_id}-${line.unit_id ?? "base"}`,
    ),
  );

  const payload: Array<Record<string, unknown>> = [];

  scopedItems.forEach(({ item, expectedQuantity, units }) => {
    const fallbackUnitId = item.unit?.id || item.unit_id;
    const candidateUnits =
      units.length > 0
        ? units
        : [
            {
              item_id: item.id,
              unit_id: fallbackUnitId,
              unit_level: 1,
              conversion_factor: 1,
            } as InventoryItemUnit,
          ];

    candidateUnits.forEach((unit) => {
      const resolvedUnitId = unit.unit_id || unit.unit?.id || fallbackUnitId;
      const key = `${item.id}-${resolvedUnitId ?? "base"}`;
      if (existingKeys.has(key)) {
        return;
      }
      existingKeys.add(key);
      payload.push({
        count_id: countId,
        item_id: item.id,
        expected_quantity: expectedQuantity,
        counted_quantity: 0,
        unit_id: resolvedUnitId,
        unit_level: unit.unit_level ?? 1,
        conversion_factor: unit.conversion_factor ?? 1,
        notes: null,
        notes_per_unit: {},
      });
    });
  });

  if (!payload.length) return;

  const chunkSize = 100;
  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await client.from("inv_count_lines").insert(chunk);
    if (error) throw error;
  }
}
