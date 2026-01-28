import type {
  InventoryItem,
  InventoryUnit,
} from "@/features/inventory/hooks/types";

type UnitLookup = Record<string, InventoryUnit>;

type ManualUnitGroup = "weight" | "count" | "volume";

type ManualUnitDefinition = {
  keys: string[];
  factor: number;
  group: ManualUnitGroup;
};

const MANUAL_UNIT_DEFINITIONS: ManualUnitDefinition[] = [
  { keys: ["g", "gram", "grams"], factor: 1, group: "weight" },
  { keys: ["kg", "kilogram", "kilograms"], factor: 1000, group: "weight" },
  { keys: ["mg", "milligram", "milligrams"], factor: 0.001, group: "weight" },
  {
    keys: ["lb", "lbs", "pound", "pounds"],
    factor: 453.59237,
    group: "weight",
  },
  { keys: ["oz", "ounce", "ounces"], factor: 28.349523125, group: "weight" },
  { keys: ["each", "ea", "unit", "units"], factor: 1, group: "count" },
];

const manualUnitMap = (() => {
  const map = new Map<string, { factor: number; group: ManualUnitGroup }>();
  for (const def of MANUAL_UNIT_DEFINITIONS) {
    def.keys.forEach((key) => {
      map.set(key.toLowerCase(), { factor: def.factor, group: def.group });
    });
  }
  return map;
})();

export type ProductionRecipeLine = {
  ingredient_id: string;
  quantity_needed: number;
  unit_id: string;
  yield_amount?: number | null;
  ingredient?: InventoryItem | null;
  unit?: InventoryUnit | null;
};

export type ProductionMaterialUsage = {
  ingredientId: string;
  ingredient?: InventoryItem | null;
  quantityUsed: number;
  quantityInRecipeUnit: number;
  unitId: string;
  unit?: InventoryUnit | null;
  unitCost: number;
  totalCost: number;
  recipeUnit?: InventoryUnit | null;
  conversionFactor?: number | null;
};

export type ProductionCalculationInput = {
  item: InventoryItem;
  producedQuantity: number;
  producedUnitId: string;
  recipeLines: ProductionRecipeLine[];
  units: InventoryUnit[];
};

export type ProductionCalculationResult = {
  producedQuantityInItemUnit: number;
  materials: ProductionMaterialUsage[];
  materialCostTotal: number;
  warnings: string[];
};

function buildUnitLookup(units: InventoryUnit[]): UnitLookup {
  return units.reduce<UnitLookup>((acc, unit) => {
    acc[unit.id] = unit;
    return acc;
  }, {});
}

function normaliseUnitKey(unit?: InventoryUnit | null): string | null {
  if (!unit) return null;
  return (unit.abbreviation || unit.name || "").toLowerCase() || null;
}

function manualConversionFactor(
  from?: InventoryUnit | null,
  to?: InventoryUnit | null,
): number | null {
  if (!from || !to) return null;
  const fromKey = normaliseUnitKey(from);
  const toKey = normaliseUnitKey(to);
  if (!fromKey || !toKey) return null;

  const fromDef = manualUnitMap.get(fromKey);
  const toDef = manualUnitMap.get(toKey);
  if (!fromDef || !toDef) return null;
  if (fromDef.group !== toDef.group) return null;

  return fromDef.factor / toDef.factor;
}

function factorToRoot(
  unitsById: UnitLookup,
  unitId: string,
): { rootId: string; factor: number } | null {
  const visited = new Set<string>();
  let current = unitsById[unitId];
  if (!current) {
    return null;
  }
  let factor = 1;

  while (current) {
    if (visited.has(current.id)) {
      return null;
    }
    visited.add(current.id);

    if (current.base_unit_id && current.conversion_factor) {
      const parent = unitsById[current.base_unit_id];
      if (!parent) {
        return null;
      }
      factor *= current.conversion_factor || 1;
      current = parent;
      continue;
    }

    if (current.parent_unit_id && current.conversion_to_parent) {
      const parent = unitsById[current.parent_unit_id];
      if (!parent) {
        return null;
      }
      factor *= current.conversion_to_parent || 1;
      current = parent;
      continue;
    }

    break;
  }

  return { rootId: current?.id ?? unitId, factor };
}

export function getConversionFactor(
  unitsById: UnitLookup,
  fromUnitId: string,
  toUnitId: string,
): number | null {
  if (fromUnitId === toUnitId) {
    return 1;
  }

  const fromPath = factorToRoot(unitsById, fromUnitId);
  const toPath = factorToRoot(unitsById, toUnitId);

  if (fromPath && toPath && fromPath.rootId === toPath.rootId) {
    if (toPath.factor === 0) {
      return null;
    }
    return fromPath.factor / toPath.factor;
  }

  const fromUnit = unitsById[fromUnitId];
  const toUnit = unitsById[toUnitId];
  const manualFactor = manualConversionFactor(fromUnit, toUnit);
  if (manualFactor) {
    return manualFactor;
  }

  return null;
}

export function convertQuantityWithFallback(
  unitsById: UnitLookup,
  quantity: number,
  fromUnitId: string,
  toUnitId: string,
): { value: number; factor: number | null } {
  if (quantity === 0 || fromUnitId === toUnitId) {
    return { value: quantity, factor: 1 };
  }

  const factor = getConversionFactor(unitsById, fromUnitId, toUnitId);
  if (factor == null) {
    return { value: quantity, factor: null };
  }

  return { value: quantity * factor, factor };
}

function round(value: number, precision = 4): number {
  const factor = Math.pow(10, precision);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateProductionMaterials(
  input: ProductionCalculationInput,
): ProductionCalculationResult {
  const { item, producedQuantity, producedUnitId, recipeLines, units } = input;
  const unitsById = buildUnitLookup(units);
  const warnings: string[] = [];

  const { value: producedQuantityInItemUnit, factor: producedFactor } =
    convertQuantityWithFallback(
      unitsById,
      producedQuantity,
      producedUnitId,
      item.unit_id,
    );

  if (producedFactor == null) {
    warnings.push(
      `No unit conversion path from production unit (${producedUnitId}) to item unit (${item.unit_id}); using entered quantity`,
    );
  }

  const finalProducedQuantity = round(producedQuantityInItemUnit, 4);
  const materials: ProductionMaterialUsage[] = [];

  for (const line of recipeLines) {
    if (!line.ingredient_id) continue;
    const ingredient = line.ingredient ?? null;
    const ingredientUnitId = ingredient?.unit_id ?? line.unit_id;
    if (!ingredientUnitId) {
      warnings.push(
        `Missing unit information for ingredient ${line.ingredient_id}`,
      );
      continue;
    }

    const multiplierSource =
      line.yield_amount && line.yield_amount > 0 ? line.yield_amount : 1;
    const multiplier = finalProducedQuantity / multiplierSource;
    const quantityInRecipeUnit = round(
      (line.quantity_needed || 0) * multiplier,
      6,
    );

    const { value: quantityInIngredientUnit, factor: conversionFactor } =
      convertQuantityWithFallback(
        unitsById,
        quantityInRecipeUnit,
        line.unit_id,
        ingredientUnitId,
      );

    if (conversionFactor == null && line.unit_id !== ingredientUnitId) {
      const fromUnit = unitsById[line.unit_id];
      const toUnit = unitsById[ingredientUnitId];
      warnings.push(
        `Could not convert ${quantityInRecipeUnit} ${fromUnit?.abbreviation || fromUnit?.name || "units"} of ${
          ingredient?.name || "ingredient"
        } to ${toUnit?.abbreviation || toUnit?.name || "target unit"}; using recipe unit`,
      );
    }

    const unitCost = ingredient?.cost_per_unit ?? 0;
    const totalCost = round(
      (conversionFactor == null
        ? quantityInRecipeUnit
        : quantityInIngredientUnit) * unitCost,
      4,
    );

    materials.push({
      ingredientId: line.ingredient_id,
      ingredient,
      quantityUsed: round(
        conversionFactor == null
          ? quantityInRecipeUnit
          : quantityInIngredientUnit,
        4,
      ),
      quantityInRecipeUnit: round(quantityInRecipeUnit, 4),
      unitId: ingredientUnitId,
      unit: unitsById[ingredientUnitId],
      recipeUnit: unitsById[line.unit_id],
      unitCost,
      totalCost,
      conversionFactor,
    });
  }

  const materialCostTotal = round(
    materials.reduce((sum, material) => sum + (material.totalCost || 0), 0),
    4,
  );

  return {
    producedQuantityInItemUnit: finalProducedQuantity,
    materials,
    materialCostTotal,
    warnings,
  };
}
