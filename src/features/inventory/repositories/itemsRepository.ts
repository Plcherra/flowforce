import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUnit,
  InventoryItemUpdate,
  InventoryRecipeLine,
  InventoryUnit,
} from "@/features/inventory/hooks/types";
import {
  buildUnitMetaIndex,
  collectUnits,
  convertQuantity,
  tryGetConversionFactor,
} from "@/utils/inventoryUnits";
import { buildInventoryItemSetupHealth } from "@/features/inventory/utils/itemSetupHealth";
import { logger } from "@/utils/logger";

// Note: Using passthrough() as InventoryItem has complex nested types
// TODO: Define proper Zod schema for InventoryItem when types are finalized
const inventoryItemSchema: z.ZodType<InventoryItem> = z
  .object({})
  .passthrough() as unknown as z.ZodType<InventoryItem>;

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
    logger.warn(
      "[inventory] listItems called without an active company context",
      { tags: ["warning"] },
    );
    return [];
  }

  const { data: baseItems, error } = await client
    .from("inv_items")
    .select(
      `
      *,
      unit:inv_units!unitid(*),
      recipe_yield_unit:inv_units!recipe_yield_unitid(*),
      location:inv_locations!default_location_id(*),
      preferred_supplier:inv_suppliers!preferred_supplier_id(*),
      category_details:inventory_categories!categoryid(*)
    `,
    )
    .eq("is_active", true)
    .eq("company_id", activeCompanyId)
    .order("name");

  if (error) throw error;

  const items = (baseItems ?? []).map((item) =>
    inventoryItemSchema.parse(item),
  );
  if (!items.length) return [];

  const itemIds = items.map((item) => item.id);

  const [unitsResult, recipeResult, unitsCatalogResult] = await Promise.all([
    client
      .from("inv_item_units")
      .select(
        `
          *,
          unit:inv_units(*)
        `,
      )
      .in("item_id", itemIds)
      .order("unit_level", { ascending: true }),
    client
      .from("inv_recipes")
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
      .in("item_id", itemIds),
    client.from("inv_units").select("*").eq("is_active", true),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (recipeResult.error) throw recipeResult.error;
  if (unitsCatalogResult.error) throw unitsCatalogResult.error;

  const unitsByItem = (unitsResult.data ?? []).reduce<
    Record<string, InventoryItemUnit[]>
  >((acc, unit) => {
    if (!acc[unit.item_id]) acc[unit.item_id] = [];
    acc[unit.item_id].push(unit as unknown as InventoryItemUnit);
    return acc;
  }, {});

  const recipesByItem = (recipeResult.data ?? []).reduce<
    Record<string, InventoryRecipeLine[]>
  >((acc, recipe) => {
    if (!acc[recipe.item_id]) acc[recipe.item_id] = [];
    acc[recipe.item_id].push(recipe as unknown as InventoryRecipeLine);
    return acc;
  }, {});

  const unitCollection = collectUnits([
    unitsCatalogResult.data as InventoryUnit[],
    items.map((item) => item.unit),
    items.map((item) => item.recipe_yield_unit),
    (unitsResult.data ?? []).map((u) => u.unit as InventoryUnit),
    (recipeResult.data ?? []).map((line) => line.unit as InventoryUnit),
    (recipeResult.data ?? []).map(
      (line) => line.ingredient?.unit as InventoryUnit | undefined,
    ),
  ]);

  const unitMeta = buildUnitMetaIndex(unitCollection);

  return items.map((item) => {
    const itemUnits = unitsByItem[item.id] || [];
    const recipeLines = recipesByItem[item.id] || [];
    const recipeCost = calculateRecipeCost(item, recipeLines, unitMeta);
    const itemWithRelations: InventoryItem = {
      ...item,
      units: itemUnits,
      recipes: recipeLines.length
        ? [
            {
              id: `recipe-${item.id}`,
              item_id: item.id,
              lines: recipeLines,
              total_cost: recipeCost.totalCost ?? undefined,
              cost_per_unit: recipeCost.costPerUnit ?? undefined,
              yield_quantity:
                item.recipe_yield_quantity ?? recipeLines[0]?.yield_amount ?? 1,
              yield_unitid:
                item.recipe_yield_unitid ??
                recipeLines[0]?.unitid ??
                item.unitid,
            },
          ]
        : [],
      recipe_cost_per_unit: recipeCost.costPerUnit ?? undefined,
      calculated_cost_per_unit:
        recipeCost.costPerUnit ?? item.cost_per_unit ?? undefined,
    };

    return {
      ...itemWithRelations,
      setup_health: buildInventoryItemSetupHealth(itemWithRelations, unitMeta),
    };
  });
}

export async function createInventoryItem(payload: InventoryItemInsert) {
  const { data, error } = await supabase
    .from("inv_items")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function updateInventoryItem(
  id: string,
  updates: InventoryItemUpdate,
) {
  const { data, error } = await supabase
    .from("inv_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inv_items").delete().eq("id", id);
  if (error) throw error;
}

function calculateRecipeCost(
  item: InventoryItem,
  lines: InventoryRecipeLine[],
  unitMeta: ReturnType<typeof buildUnitMetaIndex>,
) {
  if (!lines.length) {
    return {
      totalCost: item.cost_per_unit ?? null,
      costPerUnit: item.cost_per_unit ?? null,
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

    const ingredientUnitId = ingredient.unitid || ingredient.unit?.id || null;

    const conversion = tryGetConversionFactor(
      unitMeta,
      line.unitid,
      ingredientUnitId,
    );

    if (conversion.factor === null) {
      return sum;
    }

    const normalizedQuantity = convertQuantity(
      unitMeta,
      lineQuantity,
      line.unitid,
      ingredientUnitId,
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
    costPerUnit: totalCost > 0 ? totalCost / normalizedYield : null,
  };
}
