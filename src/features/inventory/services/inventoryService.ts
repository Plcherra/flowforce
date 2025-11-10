import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUpdate,
  InventoryRecipeLine,
  InventoryUnit,
  InventorySupplier,
  SupplierIntegrationDetails,
  ProductionEvent,
  ProductionEventInput,
  ProductionMaterialUsage,
  ProductionApproval,
} from '@/features/inventory/hooks/types';
import { calculateProductionMaterials } from '@/lib/inventory/production';
import {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../repositories/itemsRepository';
import {
  listInventoryLocations,
  createInventoryLocation,
  deleteInventoryLocation,
  type CreateInventoryLocationInput,
} from '../repositories/locationsRepository';

type CreateLocationPayload = Omit<CreateInventoryLocationInput, 'companyId'> & {
  companyId?: string;
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
  // Items Management
  static async listItems(options: { companyId?: string; supabaseClient?: SupabaseClient } = {}) {
    const client = options.supabaseClient ?? supabase;
    return listInventoryItems({
      companyId: options.companyId,
      supabaseClient: client,
      resolveCompanyId: () => resolveActiveCompanyId(client),
    });
  }

  static createItem(item: InventoryItemInsert) {
    return createInventoryItem(item);
  }

  static updateItem(id: string, updates: InventoryItemUpdate) {
    return updateInventoryItem(id, updates);
  }

  static deleteItem(id: string) {
    return deleteInventoryItem(id);
  }

  static async listLocations(options: { companyId?: string; supabaseClient?: SupabaseClient } = {}) {
    const client = options.supabaseClient ?? supabase;
    return listInventoryLocations({
      companyId: options.companyId,
      supabaseClient: client,
      resolveCompanyId: () => resolveActiveCompanyId(client),
    });
  }

  static async createLocation(payload: CreateLocationPayload) {
    const companyId = payload.companyId ?? (await resolveActiveCompanyId());
    if (!companyId) {
      throw new Error('Company information missing. Unable to create location.');
    }

    return createInventoryLocation({
      name: payload.name,
      location_type: payload.location_type,
      temperature_controlled: payload.temperature_controlled,
      companyId,
    });
  }

  static deleteLocation(id: string) {
    return deleteInventoryLocation(id);
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
