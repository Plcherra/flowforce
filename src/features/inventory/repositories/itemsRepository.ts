import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUnit,
  InventoryItemUpdate,
  InventoryRecipeLine,
  InventoryUnit,
} from '@/features/inventory/hooks/types';
import { buildUnitMetaIndex, collectUnits, convertQuantity } from '@/utils/inventoryUnits';

const inventoryItemSchema: z.ZodType<InventoryItem> = z.any();

type ListItemsOptions = {
  companyId?: string;
  supabaseClient?: SupabaseClient;
  resolveCompanyId: () => Promise<string | null>;
};

export async function listInventoryItems({
  companyId,
  supabaseClient,
  resolveCompanyId,
}: ListItemsOptions): Promise<InventoryItem[]> {
  const client = supabaseClient ?? supabase;
  const activeCompanyId = companyId ?? (await resolveCompanyId());

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

  const items = (baseItems ?? []).map((item) => inventoryItemSchema.parse(item));
  if (!items.length) return [];

  const itemIds = items.map((item) => item.id);

  const [unitsResult, recipeResult] = await Promise.all([
    client
      .from('inv_item_units')
      .select(
        `
          *,
          unit:inv_units(*)
        `,
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
        `,
      )
      .in('item_id', itemIds),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (recipeResult.error) throw recipeResult.error;

  const unitsByItem = (unitsResult.data ?? []).reduce<Record<string, InventoryItemUnit[]>>((acc, unit) => {
    if (!acc[unit.item_id]) acc[unit.item_id] = [];
    acc[unit.item_id].push(unit as unknown as InventoryItemUnit);
    return acc;
  }, {});

  const recipesByItem = (recipeResult.data ?? []).reduce<Record<string, InventoryRecipeLine[]>>((acc, recipe) => {
    if (!acc[recipe.item_id]) acc[recipe.item_id] = [];
    acc[recipe.item_id].push(recipe as unknown as InventoryRecipeLine);
    return acc;
  }, {});

  const unitCollection = collectUnits([
    items.map((item) => item.unit),
    items.map((item) => item.recipe_yield_unit),
    (unitsResult.data ?? []).map((u) => u.unit as InventoryUnit),
    (recipeResult.data ?? []).map((line) => line.unit as InventoryUnit),
    (recipeResult.data ?? []).map((line) => line.ingredient?.unit as InventoryUnit | undefined),
  ]);

  const unitMeta = buildUnitMetaIndex(unitCollection);

  return items.map((item) => {
    const itemUnits = unitsByItem[item.id] || [];
    const recipeLines = recipesByItem[item.id] || [];
    const recipeCost = calculateRecipeCost(item, recipeLines, unitMeta);

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
              yield_quantity: item.recipe_yield_quantity ?? recipeLines[0]?.yield_amount ?? 1,
              yield_unit_id: item.recipe_yield_unit_id ?? recipeLines[0]?.unit_id ?? item.unit_id,
            },
          ]
        : [],
      recipe_cost_per_unit: recipeCost.costPerUnit ?? undefined,
      calculated_cost_per_unit: recipeCost.costPerUnit ?? item.cost_per_unit ?? undefined,
    };
  });
}

export async function createInventoryItem(payload: InventoryItemInsert) {
  const { data, error } = await supabase.from('inv_items').insert(payload).select().single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function updateInventoryItem(id: string, updates: InventoryItemUpdate) {
  const { data, error } = await supabase.from('inv_items').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from('inv_items').delete().eq('id', id);
  if (error) throw error;
}

function calculateRecipeCost(
  item: InventoryItem,
  lines: InventoryRecipeLine[],
  unitMeta: ReturnType<typeof buildUnitMetaIndex>,
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

    const normalizedQuantity = convertQuantity(unitMeta, lineQuantity, line.unit_id, ingredientUnitId);

    const lineCost = normalizedQuantity * ingredientCost;
    return Number.isFinite(lineCost) ? sum + lineCost : sum;
  }, 0);

  const yieldQuantity =
    item.recipe_yield_quantity ||
    lines[0]?.yield_amount ||
    item.unit_quantity ||
    1;

  const normalizedYield = yieldQuantity && Number.isFinite(yieldQuantity) && yieldQuantity > 0 ? yieldQuantity : 1;

  return {
    totalCost,
    costPerUnit: totalCost / normalizedYield,
  };
}
