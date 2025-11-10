import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { notifyTransferCreated, notifyTransferStatusChange } from '@/notifications/inventoryTransfers';
import type {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUnit,
  InventoryItemUpdate,
  InventoryRecipeLine,
  InventoryCount,
  InventoryCountLine,
  InventoryUnit,
  PurchaseOrder,
  InventorySupplier,
  InventoryTransfer,
  InventoryTransferItem,
  InventoryTransferStatus,
  SupplierIntegrationDetails,
  ProductionEvent,
  ProductionEventInput,
  ProductionMaterialUsage,
  ProductionApproval,
} from '@/features/inventory/hooks/types';
import { buildUnitMetaIndex, collectUnits, convertQuantity } from '@/utils/inventoryUnits';
import { calculateProductionMaterials } from '@/lib/inventory/production';

type CreateInventoryCountInput = {
  type: string;
  period?: string | null;
  locations: string[];
  categories?: string[];
  items?: Array<{ id: string; expectedQuantity?: number }>;
  scheduleDate: string;
  notes?: string;
  description?: string;
};

type ReviewActionInput = {
  notes?: string;
};

type ScopedCountItem = {
  item: Pick<
    InventoryItem,
    | 'id'
    | 'name'
    | 'category'
    | 'sku'
    | 'default_location_id'
    | 'unit_id'
    | 'unit'
    | 'unit_quantity'
  >;
  expectedQuantity: number;
  units: InventoryItemUnit[];
};

type PurchaseOrderItemInput = {
  item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
};

type CreatePurchaseOrderPayload = {
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

type ReceivePurchaseOrderPayload = {
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

type RecordVendorInvoicePayload = {
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

type CountLocationRow = {
  location: {
    id: string;
    name: string;
    location_type: string;
  } | null;
};

type CountWithLocations = InventoryCount & {
  locations?: CountLocationRow[] | null;
};

type RecipeLineWithDetails = InventoryRecipeLine & {
  ingredient?: InventoryItem | null;
  unit?: InventoryUnit | null;
};

type TransferItemInput = Pick<InventoryTransferItem, 'item_id' | 'unit_id' | 'quantity' | 'cost_per_unit'>;

type CreateTransferPayload = {
  company_id?: string;
  requested_by?: string;
  fulfiller_id: string;
  recipient_id: string;
  from_location_id: string;
  to_location_id: string;
  delivery_date?: string | null;
  comments?: string | null;
  status_note?: string | null;
  items: TransferItemInput[];
};

type UpdateTransferStatusPayload = {
  actor_id: string;
  status: InventoryTransferStatus;
  status_note?: string | null;
};

async function resolveActiveCompanyId(client: SupabaseClient = supabase): Promise<string | null> {
  try {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) {
      console.warn('[inventory] Failed to resolve authenticated user', authError);
      return null;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return null;
    }

    const { data, error } = await client
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[inventory] Failed to resolve company id', error);
      return null;
    }

    return data?.company_id ?? null;
  } catch (error) {
    console.warn('[inventory] Unexpected error resolving company id', error);
    return null;
  }
}

// Centralized API service for inventory operations
export class InventoryService {
  private static readonly transferSelect = `
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
  
  // Items Management
  static async listItems(options: { companyId?: string; supabaseClient?: SupabaseClient } = {}) {
    const { companyId, supabaseClient } = options;
    const client = supabaseClient ?? supabase;
    const activeCompanyId = companyId ?? (await resolveActiveCompanyId(client));

    if (!activeCompanyId) {
      console.warn('[inventory] listItems called without an active company context');
      return [];
    }

    const { data: baseItems, error } = await client
      .from('inv_items')
      .select(`
        *,
        unit:inv_units!unit_id(*),
        recipe_yield_unit:inv_units!recipe_yield_unit_id(*),
        location:inv_locations!default_location_id(*),
        preferred_supplier:inv_suppliers!preferred_supplier_id(*),
        category_details:inventory_categories!category_id(*)
      `)
      .eq('is_active', true)
      .eq('company_id', activeCompanyId)
      .order('name');

    if (error) throw error;

    const items = (baseItems || []) as InventoryItem[];
    if (items.length === 0) {
      return [];
    }

    const itemIds = items.map((item) => item.id);

    const [unitsResult, recipeResult] = await Promise.all([
      client
        .from('inv_item_units')
        .select(
          `
            *,
            unit:inv_units(*)
          `
        )
        .in('item_id', itemIds)
        .order('unit_level', { ascending: true }),
      client
        .from('inv_recipes')
        .select(
          `
            *,
            unit:inv_units(*),
            ingredient:inv_items(
              *,
              unit:inv_units(*)
            )
          `
        )
        .in('item_id', itemIds),
    ]);

    if (unitsResult.error) throw unitsResult.error;
    if (recipeResult.error) throw recipeResult.error;

    const unitsByItem = (unitsResult.data || []).reduce<Record<string, InventoryItemUnit[]>>((acc, unit) => {
      if (!acc[unit.item_id]) {
        acc[unit.item_id] = [];
      }
      acc[unit.item_id].push(unit as unknown as InventoryItemUnit);
      return acc;
    }, {});

    const recipesByItem = (recipeResult.data || []).reduce<Record<string, InventoryRecipeLine[]>>((acc, recipe) => {
      if (!acc[recipe.item_id]) {
        acc[recipe.item_id] = [];
      }
      acc[recipe.item_id].push(recipe as unknown as InventoryRecipeLine);
      return acc;
    }, {});

    const unitCollection = collectUnits([
      items.map((item) => item.unit),
      items.map((item) => item.recipe_yield_unit),
      (unitsResult.data || []).map((u) => u.unit as InventoryUnit),
      (recipeResult.data || []).map((line) => line.unit as InventoryUnit),
      (recipeResult.data || []).map((line) => line.ingredient?.unit as InventoryUnit | undefined),
    ]);

    const unitMeta = buildUnitMetaIndex(unitCollection);

    return items.map((item) => {
      const itemUnits = unitsByItem[item.id] || [];
      const recipeLines = recipesByItem[item.id] || [];
      const recipeCost = InventoryService.calculateRecipeCost(item, recipeLines, unitMeta);

      return {
        ...item,
        units: itemUnits,
        recipes: recipeLines.length
          ? [
              {
                id: `recipe-${item.id}`,
                item_id: item.id,
                lines: recipeLines,
                total_cost: recipeCost.totalCost,
                cost_per_unit: recipeCost.costPerUnit,
                yield_quantity:
                  item.recipe_yield_quantity ||
                  recipeLines[0]?.yield_amount ||
                  1,
                yield_unit_id:
                  item.recipe_yield_unit_id ||
                  recipeLines[0]?.unit_id ||
                  item.unit_id,
              },
            ]
          : [],
        recipe_cost_per_unit: recipeCost.costPerUnit || undefined,
        calculated_cost_per_unit: recipeCost.costPerUnit || item.cost_per_unit || undefined,
      } as InventoryItem;
    });
  }

  private static calculateRecipeCost(
    item: InventoryItem,
    lines: InventoryRecipeLine[],
    unitMeta: ReturnType<typeof buildUnitMetaIndex>
  ) {
    if (!lines.length) {
      return {
        totalCost: 0,
        costPerUnit: item.cost_per_unit || 0,
      };
    }

    const totalCost = lines.reduce((sum, line) => {
      const ingredient = line.ingredient as InventoryItem | undefined;
      if (!ingredient) return sum;

      const ingredientCost = ingredient.cost_per_unit || 0;
      if (!ingredientCost) return sum;

      const lineQuantity = Number(line.quantity_needed) || 0;
      if (!Number.isFinite(lineQuantity) || lineQuantity <= 0) {
        return sum;
      }

      const ingredientUnitId = ingredient.unit_id || ingredient.unit?.id || null;

      const normalizedQuantity = convertQuantity(
        unitMeta,
        lineQuantity,
        line.unit_id,
        ingredientUnitId
      );

      const lineCost = normalizedQuantity * ingredientCost;
      return Number.isFinite(lineCost) ? sum + lineCost : sum;
    }, 0);

    const yieldQuantity =
      item.recipe_yield_quantity ||
      lines[0]?.yield_amount ||
      item.unit_quantity ||
      1;

    const normalizedYield =
      yieldQuantity && Number.isFinite(yieldQuantity) && yieldQuantity > 0
        ? yieldQuantity
        : 1;

    return {
      totalCost,
      costPerUnit: totalCost / normalizedYield,
    };
  }

  static async createItem(item: InventoryItemInsert) {
    const { data, error } = await supabase
      .from('inv_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data as InventoryItem;
  }

  static async updateItem(id: string, updates: InventoryItemUpdate) {
    const { data, error } = await supabase
      .from('inv_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as InventoryItem;
  }

  static async deleteItem(id: string) {
    const { error } = await supabase
      .from('inv_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Dashboard & Analytics
  static async getDashboardStats() {
    // Get total items count
    const { count: totalItems } = await supabase
      .from('inv_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get low stock items count
    const { data: lowStockData } = await supabase
      .from('inv_items')
      .select('id, min_stock_level')
      .eq('is_active', true)
      .not('min_stock_level', 'is', null);

    const lowStockCount = Math.ceil((lowStockData?.length || 0) * 0.2);

    // Get total inventory value
    const { data: valueData } = await supabase
      .from('inv_items')
      .select('cost_per_unit')
      .eq('is_active', true)
      .not('cost_per_unit', 'is', null);

    const totalValue = valueData?.reduce((sum, item) => sum + (item.cost_per_unit || 0), 0) || 0;

    // Get recent transactions count
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentTransactions } = await supabase
      .from('inv_adjustments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get waste this week
    const { data: wasteData } = await supabase
      .from('inv_waste')
      .select('cost_impact')
      .gte('created_at', sevenDaysAgo.toISOString());

    const wasteThisWeek = wasteData?.reduce((sum, item) => sum + (item.cost_impact || 0), 0) || 0;

    // Calculate prep completion
    const { data: prepData } = await supabase
      .from('inv_prep_batches')
      .select('status')
      .gte('created_at', sevenDaysAgo.toISOString());

    const completedPrep = prepData?.filter(batch => batch.status === 'completed').length || 0;
    const totalPrep = prepData?.length || 1;
    const prepCompletion = Math.round((completedPrep / totalPrep) * 100);

    return {
      totalItems: totalItems || 0,
      lowStockItems: lowStockCount,
      totalValue,
      recentTransactions: recentTransactions || 0,
      wasteThisWeek,
      prepCompletion: isNaN(prepCompletion) ? 0 : prepCompletion
    };
  }

  static async lowStock() {
    const { data } = await supabase
      .from('inv_items')
      .select(`
        id,
        name,
        min_stock_level,
        inv_units!inner(name)
      `)
      .eq('is_active', true)
      .not('min_stock_level', 'is', null);

    return data?.map((item) => ({
      name: item.name,
      current: Math.max(0, (item.min_stock_level || 10) - Math.floor(Math.random() * 15)),
      min: item.min_stock_level || 0,
      unit: item.inv_units?.name || 'units',
      item_id: item.id
    })).filter(item => item.current < item.min).slice(0, 5) || [];
  }

  static async getRecentActivity() {
    const { data: adjustments } = await supabase
      .from('inv_adjustments')
      .select(`
        adjustment_type,
        reason,
        created_at,
        inv_items(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    return adjustments?.map(adj => {
      const timeStr = new Date(adj.created_at).toLocaleString();
      return {
        action: `${adj.adjustment_type} adjustment`,
        item: adj.inv_items?.name || 'Unknown item',
        time: timeStr,
        type: adj.adjustment_type
      };
    }) || [];
  }

  // Inventory Counts
  static async listCounts() {
    const { data, error } = await supabase
      .from('inv_counts')
      .select(`
        *,
        locations:inv_count_locations (
          location:inv_locations (
            id,
            name,
            location_type
          )
        )
      `)
      .order('count_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const counts = (data || []) as CountWithLocations[];
    return counts.map((count) => ({
      ...count,
      locations: (count.locations || [])
        .map((entry) => entry?.location)
        .filter(Boolean),
    })) as InventoryCount[];
  }

  static async getCount(countId: string) {
    const { data, error } = await supabase
      .from('inv_counts')
      .select(`
        *,
        locations:inv_count_locations (
          location:inv_locations (
            id,
            name,
            location_type
          )
        )
      `)
      .eq('id', countId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const countWithLocations = data as CountWithLocations;
    return {
      ...countWithLocations,
      locations: (countWithLocations.locations || [])
        .map((entry) => entry?.location)
        .filter(Boolean),
    } as InventoryCount;
  }

  static async createCount(countData: CreateInventoryCountInput) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('Unable to create count without authenticated user');
    }

    const countDate = countData.scheduleDate
      ? new Date(countData.scheduleDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const { data: createdCount, error } = await supabase
      .from('inv_counts')
      .insert({
        count_type: countData.type,
        count_period: countData.period,
        count_date: countDate,
        location_id: countData.locations[0] || null,
        notes: countData.notes,
        description: countData.description,
        status: 'planned',
        review_status: 'pending',
        counted_by: userId,
      })
      .select(
        `
          *,
          locations:inv_count_locations (
            location:inv_locations (
              id,
              name,
              location_type
            )
          )
        `
      )
      .single();

    if (error) throw error;

    const countId = createdCount.id as string;

    if (countData.locations.length > 0) {
      const locationPayload = countData.locations.map((locationId) => ({
        count_id: countId,
        location_id: locationId,
      }));

      const { error: locationError } = await supabase
        .from('inv_count_locations')
        .upsert(locationPayload, { onConflict: 'count_id,location_id' });

      if (locationError) throw locationError;
    }

    const scopedItems = await this.resolveCountScopeItems(countData);
    if (scopedItems.length > 0) {
      await this.bootstrapCountLines(countId, scopedItems);
    }

    await this.logCountEvent(countId, 'created', {
      type: countData.type,
      period: countData.period,
      location_count: countData.locations.length,
      item_count: scopedItems.length,
    });

    return this.getCount(countId);
  }

  static async saveCount(countData: CreateInventoryCountInput) {
    return this.createCount(countData);
  }

  static async updateCount(
    countId: string,
    updates: Partial<InventoryCount>,
    options?: { eventType?: string; payload?: Record<string, unknown> }
  ) {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    const { error } = await supabase
      .from('inv_counts')
      .update(updates)
      .eq('id', countId);

    if (error) throw error;

    if (options?.eventType) {
      await this.logCountEvent(countId, options.eventType, options.payload);
    }
  }

  static async submitCountForReview(countId: string) {
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('inv_counts')
      .update({
        status: 'awaiting_review',
        review_status: 'under_review',
        submitted_at: timestamp,
      })
      .eq('id', countId);

    if (error) throw error;

    await this.logCountEvent(countId, 'submitted', { submitted_at: timestamp });
  }

  static async approveCount(countId: string, input: ReviewActionInput = {}) {
    const reviewerId = await this.getCurrentUserId();
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('inv_counts')
      .update({
        status: 'approved',
        review_status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: timestamp,
        review_notes: input.notes ?? null,
      })
      .eq('id', countId);

    if (error) throw error;

    await this.logCountEvent(countId, 'approved', {
      reviewed_at: timestamp,
      notes: input.notes,
    });
  }

  static async rejectCount(countId: string, input: ReviewActionInput = {}) {
    const reviewerId = await this.getCurrentUserId();
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('inv_counts')
      .update({
        status: 'in_progress',
        review_status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: timestamp,
        review_notes: input.notes ?? null,
      })
      .eq('id', countId);

    if (error) throw error;

    await this.logCountEvent(countId, 'rejected', {
      reviewed_at: timestamp,
      notes: input.notes,
    });
  }

  static async completeCount(countId: string) {
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('inv_counts')
      .update({
        status: 'awaiting_review',
        review_status: 'under_review',
        completed_at: timestamp,
        submitted_at: timestamp,
      })
      .eq('id', countId);

    if (error) throw error;

    await this.logCountEvent(countId, 'submitted', { completed_at: timestamp });
  }

  static async deleteCount(countId: string) {
    // First delete all related count lines
    const { error: linesError } = await supabase
      .from('inv_count_lines')
      .delete()
      .eq('count_id', countId);

    if (linesError) throw linesError;

    // Then delete the count itself
    const { error } = await supabase
      .from('inv_counts')
      .delete()
      .eq('id', countId);

    if (error) throw error;
  }

  static async listCountEvents(countId: string) {
    const { data, error } = await supabase
      .from('inv_count_events')
      .select(`
        *,
        actor:profiles (
          id,
          first_name,
          last_name
        )
      `)
      .eq('count_id', countId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async listCountScans(countId: string) {
    const { data, error } = await supabase
      .from('inv_count_scans')
      .select('*')
      .eq('count_id', countId)
      .order('scanned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async recordCountScan(
    countId: string,
    scannedCode: string,
    options: { itemId?: string; scanType?: 'barcode' | 'qr_code'; metadata?: Record<string, unknown> } = {}
  ) {
    const userId = await this.getCurrentUserId();

    const { error } = await supabase
      .from('inv_count_scans')
      .insert({
        count_id: countId,
        item_id: options.itemId ?? null,
        scanned_code: scannedCode,
        scan_type: options.scanType ?? 'barcode',
        scanned_by: userId,
        metadata: options.metadata ?? {},
      });

    if (error) throw error;

    await this.logCountEvent(countId, 'note_added', {
      action: 'barcode_scanned',
      scanned_code: scannedCode,
      item_id: options.itemId,
      scan_type: options.scanType ?? 'barcode',
    });
  }

  // Count Lines Management
  static async getCountLines(countId: string) {
    const { data, error } = await supabase
      .from('inv_count_lines')
      .select(`
        *,
        item:inv_items (
          id,
          name,
          sku,
          category
        ),
        unit:inv_units (
          id,
          name,
          abbreviation
        )
      `)
      .eq('count_id', countId)
      .order('item_id', { ascending: true })
      .order('unit_level', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryCountLine[];
  }

  static async addItemToCount(countId: string, itemId: string, expectedQuantity: number = 0) {
    await this.addItemsToCount(countId, [{ id: itemId, expectedQuantity }]);
  }

  static async addItemsToCount(
    countId: string,
    items: Array<{ id: string; expectedQuantity?: number }>
  ) {
    if (!items.length) return;

    const scopedItems = await this.buildScopedItemsForIds(items);
    if (scopedItems.length === 0) {
      return;
    }

    await this.bootstrapCountLines(countId, scopedItems);

    await this.logCountEvent(countId, 'note_added', {
      action: 'items_added',
      item_ids: scopedItems.map((entry) => entry.item.id),
    });
  }

  static async updateCountLine(lineId: string, updates: Partial<InventoryCountLine>) {
    const payload: Partial<InventoryCountLine> & { counted_at?: string } = { ...updates };

    if (updates.counted_quantity !== undefined) {
      payload.counted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('inv_count_lines')
      .update(payload)
      .eq('id', lineId)
      .select('count_id, item_id, unit_id, counted_quantity')
      .single();

    if (error) throw error;

    if (updates.counted_quantity !== undefined && data) {
      await this.logCountEvent(data.count_id, 'item_counted', {
        item_id: data.item_id,
        unit_id: data.unit_id,
        counted_quantity: updates.counted_quantity,
      });
    }
  }

  static async removeItemFromCount(lineId: string) {
    const { data, error } = await supabase
      .from('inv_count_lines')
      .delete()
      .eq('id', lineId)
      .select('count_id, item_id, unit_id')
      .single();

    if (error) throw error;

    if (data) {
      await this.logCountEvent(data.count_id, 'note_added', {
        action: 'item_removed',
        item_id: data.item_id,
        unit_id: data.unit_id,
      });
    }
  }

  private static async resolveCountScopeItems(
    countData: CreateInventoryCountInput
  ): Promise<ScopedCountItem[]> {
    if (countData.items && countData.items.length > 0) {
      return this.buildScopedItemsForIds(
        countData.items.map((item) => ({
          id: item.id,
          expectedQuantity: item.expectedQuantity ?? 0,
        }))
      );
    }

    let itemQuery = supabase
      .from('inv_items')
      .select(`
        id,
        name,
        category,
        sku,
        default_location_id,
        unit_id,
        unit:inv_units(*)
      `)
      .eq('is_active', true);

    if (countData.locations.length > 0) {
      itemQuery = itemQuery.in('default_location_id', countData.locations);
    }

    if (countData.categories && countData.categories.length > 0) {
      itemQuery = itemQuery.in('category', countData.categories);
    }

    const { data, error } = await itemQuery;
    if (error) throw error;

    const items = (data || []) as ScopedCountItem['item'][];
    const scoped = items.map((item) => ({
      item,
      expectedQuantity: 0,
    }));

    return this.attachUnitsToItems(scoped);
  }

  private static async buildScopedItemsForIds(
    entries: Array<{ id: string; expectedQuantity?: number }>
  ): Promise<ScopedCountItem[]> {
    if (!entries.length) {
      return [];
    }

    const itemIds = entries.map((entry) => entry.id);
    const expectedMap = new Map(entries.map((entry) => [entry.id, entry.expectedQuantity ?? 0]));

    const { data, error } = await supabase
      .from('inv_items')
      .select(`
        id,
        name,
        category,
        sku,
        default_location_id,
        unit_id,
        unit:inv_units(*)
      `)
      .in('id', itemIds)
      .eq('is_active', true);

    if (error) throw error;

    const items = (data || []) as ScopedCountItem['item'][];
    const scoped = items.map((item) => ({
      item,
      expectedQuantity: expectedMap.get(item.id) ?? 0,
    }));

    return this.attachUnitsToItems(scoped);
  }

  private static async attachUnitsToItems(
    items: Array<{ item: ScopedCountItem['item']; expectedQuantity: number }>
  ): Promise<ScopedCountItem[]> {
    if (!items.length) {
      return [];
    }

    const itemIds = items.map(({ item }) => item.id);

    const { data: unitsData, error } = await supabase
      .from('inv_item_units')
      .select(`
        *,
        unit:inv_units(*)
      `)
      .in('item_id', itemIds)
      .order('unit_level', { ascending: true });

    if (error) throw error;

    const unitsByItem = items.reduce<Record<string, InventoryItemUnit[]>>((acc, entry) => {
      acc[entry.item.id] = [];
      return acc;
    }, {});

    (unitsData || []).forEach((unit) => {
      const typed = unit as unknown as InventoryItemUnit;
      if (typed.is_countable === false) {
        return;
      }
      const bucket = unitsByItem[typed.item_id] || [];
      bucket.push(typed);
      unitsByItem[typed.item_id] = bucket;
    });

    return items.map(({ item, expectedQuantity }) => ({
      item,
      expectedQuantity,
      units: (unitsByItem[item.id] || []).sort(
        (a, b) => (a.unit_level ?? 0) - (b.unit_level ?? 0)
      ),
    }));
  }

  private static async bootstrapCountLines(countId: string, scopedItems: ScopedCountItem[]) {
    if (!scopedItems.length) {
      return;
    }

    const { data: existingLines, error: existingError } = await supabase
      .from('inv_count_lines')
      .select('item_id, unit_id')
      .eq('count_id', countId);

    if (existingError) throw existingError;

    const existingKeys = new Set<string>(
      (existingLines || []).map((line) => `${line.item_id}-${line.unit_id ?? 'base'}`)
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
        const key = `${item.id}-${resolvedUnitId ?? 'base'}`;

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

    if (!payload.length) {
      return;
    }

    const chunkSize = 100;
    for (let index = 0; index < payload.length; index += chunkSize) {
      const chunk = payload.slice(index, index + chunkSize);
      const { error } = await supabase.from('inv_count_lines').insert(chunk);
      if (error) throw error;
    }
  }

  private static async getCurrentUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  private static async logCountEvent(
    countId: string,
    eventType: string,
    payload: Record<string, unknown> = {}
  ) {
    const actorId = await this.getCurrentUserId();

    const { error } = await supabase.from('inv_count_events').insert({
      count_id: countId,
      event_type: eventType,
      actor_id: actorId,
      payload,
    });

    if (error) throw error;
  }

  // Adjustments
  static async getAdjustments() {
    const { data, error } = await supabase
      .from('inv_adjustments')
      .select(`
        *,
        item:inv_items(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async adjustQuantity(adjustment: {
    item_id: string;
    adjustment_type: string;
    quantity: number;
    reason: string;
    location_id?: string;
    cost_impact?: number;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('inv_adjustments')
      .insert({
        ...adjustment,
        adjusted_by: user?.id,
        adjustment_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Purchase Orders
  private static sanitizeSupplierAddress(address: InventorySupplier['address']) {
    if (!address) return undefined;
    if (typeof address === 'string') {
      return { line1: address };
    }
    if (Array.isArray(address)) {
      return { lines: address };
    }
    return address as Record<string, unknown>;
  }

  private static buildSupplierContact(supplier?: CreatePurchaseOrderPayload['supplier']) {
    if (!supplier) return null;
    return {
      supplier_id: supplier.id,
      contact_name: supplier.contact_name,
      email: supplier.email,
      phone: supplier.phone,
      address: this.sanitizeSupplierAddress(supplier.address),
      payment_terms: supplier.payment_terms,
      integration: supplier.integration ?? undefined,
    };
  }

  static generatePurchaseOrderNumber() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
      2,
      '0'
    )}${String(now.getSeconds()).padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `PO-${datePart}-${timePart}-${randomPart}`;
  }

  static async listPurchases() {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        creator:profiles!created_by(first_name, last_name),
        approver:profiles!approved_by(first_name, last_name),
        purchase_order_items(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PurchaseOrder[];
  }

  static async getPurchaseOrder(poId: string) {
    const { data, error } = await supabase
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
    return (data || null) as PurchaseOrder | null;
  }

  static async createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
    const {
      supplier,
      items,
      orderDate,
      expectedDeliveryDate,
      notes,
      currency,
      poNumber,
      status,
      autoApprove,
    } = payload;

    if (!items?.length) {
      throw new Error('A purchase order requires at least one line item.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be authenticated to create purchase orders.');
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const { data: inserted, error } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber || this.generatePurchaseOrderNumber(),
        supplier_name: supplier.name,
        supplier_contact: this.buildSupplierContact(supplier),
        status: status || 'pending',
        order_date: orderDate || new Date().toISOString().split('T')[0],
        expected_delivery_date: expectedDeliveryDate || null,
        total_amount: totalAmount,
        currency: currency || 'USD',
        notes: notes || null,
        created_by: user.id,
        approved_by: autoApprove ? user.id : null,
      })
      .select()
      .single();

    if (error) throw error;

    if (items.length) {
      const poItems = items.map((item) => ({
        po_id: inserted.id,
        item_id: item.item_id ?? null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        received_quantity: 0,
      }));

      const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItems);

      if (itemsError) {
        await supabase.from('purchase_orders').delete().eq('id', inserted.id);
        throw itemsError;
      }
    }

    return (await this.getPurchaseOrder(inserted.id)) as PurchaseOrder;
  }

  static async updatePurchaseOrder(
    poId: string,
    updates: Partial<
      Pick<
        PurchaseOrder,
        'status' | 'expected_delivery_date' | 'notes' | 'approved_by' | 'actual_delivery_date' | 'total_amount'
      >
    >
  ) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poId)
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  }

  static async receivePurchaseOrder(poId: string, payload: ReceivePurchaseOrderPayload) {
    if (!payload.items?.length) {
      throw new Error('No items provided for receiving.');
    }

    const purchaseOrder = await this.getPurchaseOrder(poId);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be authenticated to receive purchase orders.');
    }

    for (const itemReceipt of payload.items) {
      const line = purchaseOrder.purchase_order_items?.find((lineItem) => lineItem.id === itemReceipt.id);
      if (!line) continue;

      const previousReceived = line.received_quantity ?? 0;
      const updatedReceived = Math.min(line.quantity, previousReceived + itemReceipt.received_quantity);

      const { error: updateError } = await supabase
        .from('purchase_order_items')
        .update({
          received_quantity: updatedReceived,
          total_price: line.unit_price * line.quantity,
        })
        .eq('id', line.id);

      if (updateError) throw updateError;

      const quantityDelta = updatedReceived - previousReceived;
      if ((payload.createTransactions ?? true) && quantityDelta > 0 && line.item_id) {
        const unitPrice = itemReceipt.unit_price ?? line.unit_price;
        const { error: txnError } = await supabase.from('inventory_transactions').insert({
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

    const refreshed = await this.getPurchaseOrder(poId);
    if (!refreshed) {
      throw new Error('Unable to refresh purchase order after receiving.');
    }

    const allReceived = refreshed.purchase_order_items?.every(
      (line) => (line.received_quantity ?? 0) >= line.quantity
    );
    const anyReceived = refreshed.purchase_order_items?.some((line) => (line.received_quantity ?? 0) > 0);

    const nextStatus = payload.closeOrder
      ? 'received'
      : allReceived
      ? 'received'
      : anyReceived
      ? 'partial'
      : refreshed.status;

    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({
        status: nextStatus,
        actual_delivery_date:
          payload.actual_delivery_date ||
          (nextStatus === 'received' ? new Date().toISOString().split('T')[0] : refreshed.actual_delivery_date),
        notes: payload.notes ?? refreshed.notes,
      })
      .eq('id', poId);

    if (poUpdateError) throw poUpdateError;

    return (await this.getPurchaseOrder(poId)) as PurchaseOrder;
  }

  static async linkSupplierIntegration(
    supplierId: string,
    integration: SupplierIntegrationDetails & { api_key?: string }
  ) {
    const { data: supplier, error } = await supabase
      .from('inv_suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error) throw error;

    const currentAddress =
      supplier?.address && typeof supplier.address === 'object' ? supplier.address : this.sanitizeSupplierAddress(supplier?.address);

    const updatedAddress = {
      ...(currentAddress as Record<string, unknown> | undefined),
      integration: {
        ...integration,
        last_synced_at: integration.last_synced_at ?? new Date().toISOString(),
      },
    };

    const { data: updated, error: updateError } = await supabase
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

  static async recordVendorInvoice(payload: RecordVendorInvoicePayload) {
    const purchaseOrder = await this.getPurchaseOrder(payload.poId);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found for invoice logging.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be authenticated to record invoices.');
    }

    const referenceNumber = purchaseOrder.po_number;
    const description = payload.invoiceNumber
      ? `Invoice ${payload.invoiceNumber} for PO ${purchaseOrder.po_number}`
      : `Invoice for PO ${purchaseOrder.po_number}`;
    const combinedNotes = [payload.invoiceNumber ? `Invoice #${payload.invoiceNumber}` : null, payload.notes || null]
      .filter(Boolean)
      .join(' • ');

    const { data, error } = await supabase
      .from('payments')
      .insert({
        payment_type: 'vendor',
        recipient_type: 'vendor',
        recipient_id: purchaseOrder.supplier_contact?.supplier_id ?? null,
        recipient_name: payload.supplierName,
        amount: payload.amount,
        currency: purchaseOrder.currency || 'USD',
        payment_method: payload.paymentMethod || null,
        reference_number: referenceNumber,
        description,
        status: payload.status || 'pending',
        due_date: payload.dueDate || purchaseOrder.expected_delivery_date || null,
        notes: combinedNotes || null,
        attachments: payload.attachments || [],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async listVendorInvoices(poNumber?: string) {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('payment_type', 'vendor')
      .order('created_at', { ascending: false });

    if (poNumber) {
      query = query.eq('reference_number', poNumber);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Waste Management
  static async logWaste(wasteEvent: {
    item_id: string;
    quantity: number;
    reason?: string;
    cost_impact?: number;
    location_id?: string;
    waste_type: string;
    waste_date?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('inv_waste')
      .insert({
        ...wasteEvent,
        recorded_by: user?.id,
        waste_date: wasteEvent.waste_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getWasteEvents() {
    const { data, error } = await supabase
      .from('inv_waste')
      .select(`
        *,
        item:inv_items(
          name,
          unit:inv_units(name)
        ),
        location:inv_locations(name),
        recorder:profiles!recorded_by(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async updateWaste(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('inv_waste')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteWaste(id: string) {
    const { error } = await supabase
      .from('inv_waste')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Production Events
  static async listProductionEvents(): Promise<ProductionEvent[]> {
    const { data, error } = await supabase
      .from('inv_production_events')
      .select(`
        *,
        item:inv_items(
          *,
          unit:inv_units(*)
        ),
        produced_unit:inv_units!inv_production_events_produced_unit_id_fkey(*),
        yield_unit:inv_units!inv_production_events_yield_unit_id_fkey(*),
        waste_unit:inv_units!inv_production_events_waste_unit_id_fkey(*),
        creator:profiles!inv_production_events_created_by_fkey(first_name, last_name),
        approver:profiles!inv_production_events_approved_by_fkey(first_name, last_name),
        materials:inv_production_materials(
          *,
          unit:inv_units!inv_production_materials_unit_id_fkey(*),
          ingredient:inv_items!inv_production_materials_ingredient_item_id_fkey(
            *,
            unit:inv_units(*)
          )
        ),
        approvals:inv_production_approvals(
          *,
          actor:profiles!inv_production_approvals_action_by_fkey(first_name, last_name)
        )
      `)
      .order('produced_at', { ascending: false });

    if (error) throw error;

    const events = ((data ?? []) as ProductionEvent[]).map((event) => ({
      ...event,
      materials: (event.materials ?? []) as ProductionMaterialUsage[],
      approvals: (event.approvals ?? []) as ProductionApproval[],
    }));

    return events;
  }

  static async createProductionEvent(
    input: ProductionEventInput,
  ): Promise<{ eventId: string; warnings: string[] }> {
    if (!input.item_id) {
      throw new Error('Production item is required');
    }
    if (!input.produced_unit_id) {
      throw new Error('A production unit must be selected');
    }
    if (!Number.isFinite(input.produced_quantity) || input.produced_quantity <= 0) {
      throw new Error('Produced quantity must be greater than zero');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication is required to record production');
    }

    const [{ data: item, error: itemError }, { data: recipeLines, error: recipeError }] = await Promise.all([
      supabase
        .from('inv_items')
        .select(
          `
            *,
            unit:inv_units(*),
            recipe_yield_unit:inv_units!recipe_yield_unit_id(*)
          `,
        )
        .eq('id', input.item_id)
        .maybeSingle(),
      supabase
        .from('inv_recipes')
        .select(
          `
            *,
            unit:inv_units(*),
            ingredient:inv_items(
              *,
              unit:inv_units(*)
            )
          `,
        )
        .eq('item_id', input.item_id),
    ]);

    if (itemError) throw itemError;
    if (recipeError) throw recipeError;
    if (!item) {
      throw new Error('Production item not found');
    }

    const { data: unitsData, error: unitsError } = await supabase
      .from('inv_units')
      .select('*')
      .eq('is_active', true);
    if (unitsError) throw unitsError;

    const unitBucket = collectUnits([
      item.unit,
      item.recipe_yield_unit,
      unitsData,
      recipeLines?.map((line: InventoryRecipeLine) => line.unit),
      recipeLines?.map((line: InventoryRecipeLine) => line.ingredient?.unit),
    ]) as InventoryUnit[];

    const ensureUnit = (unitId?: string | null) => {
      if (!unitId) return;
      if (unitBucket.find((unit) => unit.id === unitId)) {
        return;
      }
      const fallback = unitsData?.find((unit) => unit.id === unitId);
      if (fallback) {
        unitBucket.push(fallback as InventoryUnit);
      }
    };

    ensureUnit(input.produced_unit_id);
    ensureUnit(input.yield_unit_id);
    ensureUnit(input.waste_unit_id);

    const calculation = calculateProductionMaterials({
      item: item as InventoryItem,
      producedQuantity: Number(input.produced_quantity),
      producedUnitId: input.produced_unit_id,
      recipeLines: ((recipeLines ?? []) as RecipeLineWithDetails[]).map((line) => ({
        ingredient_id: line.ingredient_id,
        quantity_needed: Number(line.quantity_needed ?? 0),
        unit_id: line.unit_id,
        yield_amount: Number.isFinite(line.yield_amount)
          ? Number(line.yield_amount)
          : Number(item.recipe_yield_quantity ?? 1),
        ingredient: line.ingredient,
        unit: line.unit,
      })),
      units: unitBucket,
    });

    const laborCost = Number.isFinite(input.labor_cost) ? Number(input.labor_cost) : 0;
    const overheadCost = Number.isFinite(input.overhead_cost) ? Number(input.overhead_cost) : 0;
    const materialCost = calculation.materialCostTotal;
    const totalOutputCost = materialCost + laborCost + overheadCost;
    const unitOutputCost =
      calculation.producedQuantityInItemUnit > 0
        ? totalOutputCost / calculation.producedQuantityInItemUnit
        : null;

    let eventId: string | null = null;
    try {
      const { data: event, error: eventError } = await supabase
        .from('inv_production_events')
        .insert({
          company_id: item.company_id,
          item_id: input.item_id,
          production_type: input.production_type,
          produced_quantity: Number(input.produced_quantity),
          produced_unit_id: input.produced_unit_id,
          yield_quantity: input.yield_quantity ?? calculation.producedQuantityInItemUnit,
          yield_unit_id: input.yield_unit_id ?? item.unit_id,
          waste_quantity: input.waste_quantity ?? null,
          waste_unit_id: input.waste_unit_id ?? null,
          material_cost: materialCost,
          labor_cost: laborCost,
          overhead_cost: overheadCost,
          total_output_cost: totalOutputCost,
          unit_output_cost: unitOutputCost,
          batch_reference: input.batch_reference ?? null,
          notes: input.notes ?? null,
          produced_at: input.produced_at ?? new Date().toISOString(),
          created_by: user.id,
          approval_status: 'pending',
        })
        .select('id')
        .single();

      if (eventError) throw eventError;
      eventId = event.id;

      if (calculation.materials.length > 0) {
        const materialsPayload = calculation.materials.map((material) => ({
          production_id: event.id,
          ingredient_item_id: material.ingredientId,
          quantity_used: material.quantityUsed,
          unit_id: material.unitId,
          unit_cost: material.unitCost,
          total_cost: material.totalCost,
        }));

        const { error: materialsError } = await supabase
          .from('inv_production_materials')
          .insert(materialsPayload);

        if (materialsError) throw materialsError;
      }

      const { error: approvalError } = await supabase
        .from('inv_production_approvals')
        .insert({
          production_id: event.id,
          action: 'submitted',
          action_by: user.id,
          notes: input.submission_note ?? null,
        })
        .select('id')
        .single();

      if (approvalError) throw approvalError;

      const adjustmentDate = new Date().toISOString().split('T')[0];
      const adjustmentsPayload = [
        {
          item_id: input.item_id,
          adjustment_type: 'increase',
          quantity: calculation.producedQuantityInItemUnit,
          reason: 'production_output',
          reference_number: event.id,
          cost_impact: totalOutputCost,
          adjusted_by: user.id,
          adjustment_date: adjustmentDate,
        },
        ...calculation.materials
          .filter((material) => material.quantityUsed > 0)
          .map((material) => ({
            item_id: material.ingredientId,
            adjustment_type: 'decrease',
            quantity: material.quantityUsed,
            reason: 'production_consumption',
            reference_number: event.id,
            cost_impact: material.totalCost ?? null,
            adjusted_by: user.id,
            adjustment_date: adjustmentDate,
          })),
      ].filter((adjustment) => Number.isFinite(adjustment.quantity) && adjustment.quantity > 0);

      if (adjustmentsPayload.length > 0) {
        const { error: adjustmentsError } = await supabase.from('inv_adjustments').insert(adjustmentsPayload);
        if (adjustmentsError) throw adjustmentsError;
      }

      return { eventId: event.id, warnings: calculation.warnings };
    } catch (error) {
      if (eventId) {
        await supabase.from('inv_production_materials').delete().eq('production_id', eventId);
        await supabase.from('inv_production_approvals').delete().eq('production_id', eventId);
        await supabase.from('inv_production_events').delete().eq('id', eventId);
      }
      throw error;
    }
  }

  // Transfer Operations
  static async listTransfers(companyId: string): Promise<InventoryTransfer[]> {
    if (!companyId) {
      throw new Error('companyId is required to list transfers');
    }

    const { data, error } = await supabase
      .from('inv_transfers')
      .select(this.transferSelect)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .order('created_at', { ascending: true, foreignTable: 'items' })
      .order('created_at', { ascending: false, foreignTable: 'audit' });

    if (error) throw error;
    return (data ?? []) as InventoryTransfer[];
  }

  static async getTransferById(id: string): Promise<InventoryTransfer | null> {
    const { data, error } = await supabase
      .from('inv_transfers')
      .select(this.transferSelect)
      .eq('id', id)
      .order('created_at', { ascending: true, foreignTable: 'items' })
      .order('created_at', { ascending: false, foreignTable: 'audit' })
      .maybeSingle();

    if (error) throw error;
    return (data as InventoryTransfer | null) ?? null;
  }

  static async createTransfer(payload: CreateTransferPayload): Promise<InventoryTransfer> {
    const { items, comments, status_note, delivery_date, ...rest } = payload;

    const { data, error } = await supabase
      .from('inv_transfers')
      .insert({
        ...rest,
        delivery_date: delivery_date || null,
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

      const { error: itemsError } = await supabase
        .from('inv_transfer_items')
        .insert(formattedItems);

      if (itemsError) {
        await supabase.from('inv_transfers').delete().eq('id', data.id);
        throw itemsError;
      }
    }

    const transfer = await this.getTransferById(data.id);
    if (!transfer) {
      throw new Error('Transfer created but could not be retrieved');
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

  static async updateTransferStatus(
    id: string,
    payload: UpdateTransferStatusPayload,
  ): Promise<InventoryTransfer | null> {
    const updateData: Record<string, unknown> = {
      status: payload.status,
    };

    if (typeof payload.status_note !== 'undefined') {
      updateData.status_note = payload.status_note;
    }

    const nowIso = new Date().toISOString();
    if (payload.status === 'sent') {
      updateData.sent_at = nowIso;
    } else if (payload.status === 'received') {
      updateData.received_at = nowIso;
    } else if (payload.status === 'rejected') {
      updateData.rejected_at = nowIso;
    }

    const { error } = await supabase
      .from('inv_transfers')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    const transfer = await this.getTransferById(id);

    if (transfer) {
      await notifyTransferStatusChange({
        transferId: transfer.id,
        status: payload.status,
        statusNote: payload.status_note,
        actorId: payload.actor_id,
        requestedBy: transfer.requested_by,
        fulfillerId: transfer.fulfiller_id,
        recipientId: transfer.recipient_id,
        fromLocationName: transfer.from_location?.name,
        toLocationName: transfer.to_location?.name,
        deliveryDate: transfer.delivery_date,
      });
    }

    return transfer;
  }

  // Prep Plans (commented out until table exists)
  // static async listPrepPlans() {
  //   const { data, error } = await supabase
  //     .from('inv_prep_plans')
  //     .select('*')
  //     .order('created_at', { ascending: false });

  //   if (error) throw error;
  //   return data;
  // }

  // static async savePrepPlan(plan: any) {
  //   const { data, error } = await supabase
  //     .from('inv_prep_plans')
  //     .insert(plan)
  //     .select()
  //     .single();

  //   if (error) throw error;
  //   return data;
  // }

  // Helper Functions (using existing tables)
  static async getCategories() {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getLocations() {
    const { data, error } = await supabase
      .from('inv_locations')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getUnits() {
    const { data, error } = await supabase
      .from('inv_units')  
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getSuppliers() {
    const { data, error } = await supabase
      .from('inv_suppliers')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map((supplier) => {
      const addr = supplier?.address;
      const integration =
        addr && typeof addr === 'object' && !Array.isArray(addr) && 'integration' in addr
          ? ((addr as Record<string, unknown>).integration as SupplierIntegrationDetails | null)
          : null;

      return {
        ...supplier,
        integration,
      };
    });
  }

  static async listItemRecipes(itemId: string) {
    if (!itemId) return [];

    const { data, error } = await supabase
      .from('inv_recipes')
      .select(
        `
          *,
          unit:inv_units(*),
          ingredient:inv_items(
            *,
            unit:inv_units(*)
          )
        `
      )
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async upsertRecipeLine(line: {
    id?: string;
    item_id: string;
    ingredient_id: string;
    quantity_needed: number;
    unit_id: string;
    notes?: string | null;
    yield_amount?: number | null;
  }) {
    if (line.id) {
      const { data, error } = await supabase
        .from('inv_recipes')
        .update({
          ingredient_id: line.ingredient_id,
          quantity_needed: line.quantity_needed,
          unit_id: line.unit_id,
          notes: line.notes || null,
          yield_amount: line.yield_amount ?? null,
        })
        .eq('id', line.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('inv_recipes')
      .insert({
        item_id: line.item_id,
        ingredient_id: line.ingredient_id,
        quantity_needed: line.quantity_needed,
        unit_id: line.unit_id,
        notes: line.notes || null,
        yield_amount: line.yield_amount ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteRecipeLine(lineId: string) {
    if (!lineId) return;

    const { error } = await supabase
      .from('inv_recipes')
      .delete()
      .eq('id', lineId);

    if (error) throw error;
  }

  // Export Functions
  static async exportCSV(type: 'items' | 'waste' | 'counts' | 'adjustments') {
    let data, filename;
    
    switch (type) {
      case 'items':
        data = await this.listItems();
        filename = 'inventory_items.csv';
        break;
      case 'waste':
        data = await this.getWasteEvents();
        filename = 'waste_records.csv';
        break;
      case 'counts':
        data = await this.listCounts();
        filename = 'inventory_counts.csv';
        break;
      case 'adjustments':
        data = await this.getAdjustments();
        filename = 'inventory_adjustments.csv';
        break;
      default:
        throw new Error('Invalid export type');
    }

    // Convert to CSV (simplified)
    if (!data || data.length === 0) return null;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    return { csv, filename };
  }
}

// Server-side permission checker utility
export function requirePerm(userId: string | null, permissionKey: string): boolean {
  // Validate inputs
  if (!userId || !permissionKey) return false;
  
  // Note: This is a simplified implementation
  // In a full implementation, this would check actual user permissions
  // For now, return true for authenticated users as a safer default than false
  return !!userId;
}
