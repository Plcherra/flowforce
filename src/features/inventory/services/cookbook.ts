import { supabase } from "@/integrations/supabase/client";
import type {
  InventoryItem,
  InventoryRecipeLine,
  InventoryUnit,
} from "@/features/inventory/hooks/types";
import { InventoryService } from "@/features/inventory/services/inventoryService";

export interface RecipeNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sodium?: number;
  fiber?: number;
}

export interface CookbookRecipe {
  item: InventoryItem;
  lines: InventoryRecipeLine[];
  totalCost: number;
  costPerUnit: number;
  yieldQuantity: number;
  yieldUnit?: InventoryUnit | null;
  nutrition?: RecipeNutrition | null;
}

interface RawRecipeRecord {
  id: string;
  item_id: string;
  ingredientid: string;
  quantity_needed: number;
  unitid: string;
  yield_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ingredient: (InventoryItem & { unit?: InventoryUnit | null }) | null;
  recipe_item: (InventoryItem & { unit?: InventoryUnit | null }) | null;
  unit: InventoryUnit | null;
}

interface ProductionEventInput {
  item_id: string;
  quantity: number;
  unitid?: string;
  note?: string;
  location_id?: string;
}

export class CookbookService {
  /**
   * Fetch recipe lines from Supabase and group them by recipe item.
   * Falls back to an empty array if no data exists.
   */
  static async listRecipes(): Promise<CookbookRecipe[]> {
    const { data, error } = await supabase.from("inv_recipes").select(`
      id,
      item_id,
      ingredientid,
      quantity_needed,
      unitid,
      yield_amount,
      notes,
      created_at,
      updated_at,
      ingredient:inv_items!inv_recipes_ingredientid_fkey (
        *,
        unit:inv_units(*)
      ),
      recipe_item:inv_items!inv_recipes_item_id_fkey (
        *,
        unit:inv_units(*)
      ),
      unit:inv_units(*)
    `);

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      { item: InventoryItem; lines: InventoryRecipeLine[] }
    >();

    (data as unknown as RawRecipeRecord[]).forEach((row) => {
      if (!row.recipe_item) {
        return;
      }

      if (!grouped.has(row.item_id)) {
        grouped.set(row.item_id, { item: row.recipe_item, lines: [] });
      }

      const line: InventoryRecipeLine = {
        id: row.id,
        item_id: row.item_id,
        ingredientid: row.ingredientid,
        quantity_needed: row.quantity_needed,
        unitid: row.unitid,
        notes: row.notes,
        yield_amount: row.yield_amount ?? undefined,
        ingredient: row.ingredient ?? undefined,
        unit: row.unit ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      grouped.get(row.item_id)!.lines.push(line);
    });

    return Array.from(grouped.values()).map(({ item, lines }) =>
      CookbookService.enrichRecipeFromLines(item, lines),
    );
  }

  /**
   * Compute helpful aggregates for a recipe such as costing and yield metadata.
   */
  static enrichRecipeFromLines(
    item: InventoryItem,
    lines: InventoryRecipeLine[],
  ): CookbookRecipe {
    const yieldQuantity =
      item.unit_quantity ||
      lines.find((line) => typeof line.yield_amount === "number")
        ?.yield_amount ||
      1;

    const totalCost = lines.reduce((acc, line) => {
      const ingredientCost = line.ingredient?.cost_per_unit ?? 0;
      return acc + ingredientCost * line.quantity_needed;
    }, 0);

    const costPerUnit = yieldQuantity ? totalCost / yieldQuantity : totalCost;

    return {
      item,
      lines,
      totalCost,
      costPerUnit,
      yieldQuantity,
      yieldUnit: item.unit || lines[0]?.unit,
      nutrition: CookbookService.parseNutrition(item.description),
    };
  }

  /**
   * Parse a lightweight nutrition payload from item description.
   * Accepts description strings containing key:value pairs, e.g. "Calories: 220; Protein: 12g".
   */
  static parseNutrition(description?: string | null): RecipeNutrition | null {
    if (!description) return null;

    const nutrition: RecipeNutrition = {};
    const matches = description.split(/;|\n/).map((section) => section.trim());
    matches.forEach((section) => {
      const [keyRaw, valueRaw] = section.split(":").map((part) => part.trim());
      if (!keyRaw || !valueRaw) return;

      const valueNumeric = Number.parseFloat(valueRaw.replace(/[^\d.]/g, ""));
      if (Number.isNaN(valueNumeric)) return;

      switch (keyRaw.toLowerCase()) {
        case "calories":
          nutrition.calories = valueNumeric;
          break;
        case "protein":
          nutrition.protein = valueNumeric;
          break;
        case "carbs":
        case "carbohydrates":
          nutrition.carbs = valueNumeric;
          break;
        case "fat":
          nutrition.fat = valueNumeric;
          break;
        case "sodium":
          nutrition.sodium = valueNumeric;
          break;
        case "fiber":
          nutrition.fiber = valueNumeric;
          break;
        default:
          break;
      }
    });

    return Object.keys(nutrition).length > 0 ? nutrition : null;
  }

  /**
   * Log a production event in Supabase and return the stored record.
   */
  static async logProduction(event: ProductionEventInput) {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      throw new Error("Authentication required to log production events");
    }

    const payload = {
      item_id: event.item_id,
      prep_date: new Date().toISOString().split("T")[0],
      planned_quantity: event.quantity,
      actual_quantity: event.quantity,
      batch_size: event.quantity,
      batches_made: 1,
      status: "completed",
      notes: event.note ?? null,
      prep_location_id: event.location_id ?? null,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from("invprep_batches")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Fetch recent production batches for reporting purposes.
   */
  static async listProductionEvents(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("invprep_batches")
      .select(
        `
        *,
        item:inv_items(
          id,
          name,
          unitid,
          unit:inv_units(*)
        )
      `,
      )
      .gte("prep_date", since.toISOString().split("T")[0])
      .order("prep_date", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }

  /**
   * Apply inventory deductions for each ingredient used in a recipe.
   */
  static async deductIngredients(recipe: CookbookRecipe, quantity: number) {
    if (!recipe.lines.length || quantity <= 0) return;

    await Promise.all(
      recipe.lines
        .filter((line) => line.ingredientid)
        .map((line) => {
          const deductionQty = line.quantity_needed * quantity;
          if (deductionQty <= 0) return Promise.resolve();
          return InventoryService.adjustQuantity({
            item_id: line.ingredientid,
            adjustment_type: "decrease",
            quantity: deductionQty,
            reason: `Recipe production: ${recipe.item.name}`,
          });
        }),
    );
  }

  /**
   * Create a CSV payload for a recipe sheet that can be downloaded client-side.
   */
  static buildRecipeSheetCsv(recipe: CookbookRecipe) {
    const headers = [
      "Ingredient",
      "Quantity",
      "Unit",
      "Unit Cost",
      "Line Cost",
    ];
    const rows = recipe.lines.map((line) => {
      const unitName = line.unit?.abbreviation || line.unit?.name || "";
      const ingredientCost = line.ingredient?.cost_per_unit ?? 0;
      const lineCost = ingredientCost * line.quantity_needed;
      return [
        line.ingredient?.name ?? "Unknown",
        line.quantity_needed,
        unitName,
        ingredientCost.toFixed(2),
        lineCost.toFixed(2),
      ];
    });

    rows.push([]);
    rows.push(["Total Cost", "", "", "", recipe.totalCost.toFixed(2)]);
    rows.push([
      "Yield Quantity",
      recipe.yieldQuantity,
      recipe.yieldUnit?.abbreviation || "",
      "",
      "",
    ]);
    rows.push(["Cost Per Unit", "", "", "", recipe.costPerUnit.toFixed(2)]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  /**
   * Build a CSV payload representing a daily prep summary for the provided recipes.
   */
  static buildPrepSummaryCsv(
    summary: Array<{
      recipeId: string;
      recipeName: string;
      scheduledQty: number;
      uom?: string;
      ingredients: Array<{ name: string; quantity: number; unit?: string }>;
    }>,
  ) {
    const headers = [
      "Recipe",
      "Scheduled Qty",
      "UOM",
      "Ingredient",
      "Ingredient Qty",
      "Ingredient Unit",
    ];
    const rows = summary.flatMap((entry) =>
      entry.ingredients.length
        ? entry.ingredients.map((ing) => [
            entry.recipeName,
            entry.scheduledQty,
            entry.uom || "",
            ing.name,
            ing.quantity,
            ing.unit || "",
          ])
        : [[entry.recipeName, entry.scheduledQty, entry.uom || "", "", "", ""]],
    );

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }
}
