import type {
  InventoryItem,
  InventoryUnit,
} from "@/features/inventory/hooks/types";
import {
  buildUnitMetaIndex,
  tryGetConversionFactor,
} from "@/utils/inventoryUnits";

type UnitLookup = Record<string, InventoryUnit>;
type UnitMetaIndex = ReturnType<typeof buildUnitMetaIndex>;

export type ProductionRecipeLine = {
  ingredientid: string;
  quantity_needed: number;
  unitid: string;
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
  canDeductInventory: boolean;
  costStatus: "costed" | "uncosted";
  warning?: string;
};

export type ProductionCalculationInput = {
  item: InventoryItem;
  producedQuantity: number;
  producedUnitId: string;
  yieldQuantity?: number | null;
  yieldUnitId?: string | null;
  wasteQuantity?: number | null;
  wasteUnitId?: string | null;
  laborCost?: number | null;
  overheadCost?: number | null;
  recipeLines: ProductionRecipeLine[];
  units: InventoryUnit[];
};

export type ProductionCalculationResult = {
  producedQuantityInItemUnit: number;
  yieldQuantityInItemUnit: number;
  wasteQuantityInItemUnit: number;
  costedOutputQuantity: number;
  materials: ProductionMaterialUsage[];
  materialCostTotal: number;
  laborCost: number;
  overheadCost: number;
  totalOutputCost: number;
  unitOutputCost: number | null;
  wasteCostEstimate: number;
  canRecord: boolean;
  warnings: string[];
  blockingIssues: string[];
};

function buildUnitLookup(units: InventoryUnit[]): UnitLookup {
  return units.reduce<UnitLookup>((acc, unit) => {
    acc[unit.id] = unit;
    return acc;
  }, {});
}

export function getConversionFactor(
  unitMeta: UnitMetaIndex,
  fromUnitId: string,
  toUnitId: string,
): number | null {
  return tryGetConversionFactor(unitMeta, fromUnitId, toUnitId).factor;
}

export function convertQuantityWithFallback(
  unitMeta: UnitMetaIndex,
  quantity: number,
  fromUnitId: string,
  toUnitId: string,
): { value: number; factor: number | null; reason?: string } {
  if (quantity === 0 || fromUnitId === toUnitId) {
    return { value: quantity, factor: 1 };
  }

  const conversion = tryGetConversionFactor(unitMeta, fromUnitId, toUnitId);
  const factor = conversion.factor;
  if (factor == null) {
    return { value: quantity, factor: null, reason: conversion.reason };
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
  const {
    item,
    producedQuantity,
    producedUnitId,
    yieldQuantity,
    yieldUnitId,
    wasteQuantity,
    wasteUnitId,
    recipeLines,
    units,
  } = input;
  const unitsById = buildUnitLookup(units);
  const unitMeta = buildUnitMetaIndex(units);
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  const { value: producedQuantityInItemUnit, factor: producedFactor } =
    convertQuantityWithFallback(
      unitMeta,
      producedQuantity,
      producedUnitId,
      item.unitid,
    );

  if (producedFactor == null) {
    blockingIssues.push(
      `No unit conversion path from production unit (${producedUnitId}) to item unit (${item.unitid}).`,
    );
  }

  const finalProducedQuantity = round(producedQuantityInItemUnit, 4);
  let yieldQuantityInItemUnit = finalProducedQuantity;
  if (yieldQuantity != null && Number.isFinite(yieldQuantity) && yieldQuantity > 0) {
    const { value, factor } = convertQuantityWithFallback(
      unitMeta,
      yieldQuantity,
      yieldUnitId ?? item.unitid,
      item.unitid,
    );
    if (factor == null) {
      warnings.push(
        `Could not convert actual yield to item unit; using produced quantity for unit cost.`,
      );
    } else {
      yieldQuantityInItemUnit = round(value, 4);
    }
  }

  let wasteQuantityInItemUnit = 0;
  if (wasteQuantity != null && Number.isFinite(wasteQuantity) && wasteQuantity > 0) {
    const { value, factor } = convertQuantityWithFallback(
      unitMeta,
      wasteQuantity,
      wasteUnitId ?? item.unitid,
      item.unitid,
    );
    if (factor == null) {
      warnings.push("Could not convert waste quantity to item unit.");
    } else {
      wasteQuantityInItemUnit = round(value, 4);
    }
  }

  if (!recipeLines.length) {
    warnings.push("No recipe lines configured; production material cost is zero.");
  }

  const materials: ProductionMaterialUsage[] = [];

  for (const line of recipeLines) {
    if (!line.ingredientid) continue;
    const ingredient = line.ingredient ?? null;
    const ingredientUnitId = ingredient?.unitid ?? line.unitid;
    if (!ingredientUnitId) {
      warnings.push(
        `Missing unit information for ingredient ${line.ingredientid}`,
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
        unitMeta,
        quantityInRecipeUnit,
        line.unitid,
        ingredientUnitId,
      );

    if (conversionFactor == null && line.unitid !== ingredientUnitId) {
      const fromUnit = unitsById[line.unitid];
      const toUnit = unitsById[ingredientUnitId];
      const warning = `Could not convert ${quantityInRecipeUnit} ${fromUnit?.abbreviation || fromUnit?.name || "units"} of ${
        ingredient?.name || "ingredient"
      } to ${toUnit?.abbreviation || toUnit?.name || "target unit"}; not deducting or costing this line.`;
      warnings.push(
        warning,
      );

      materials.push({
        ingredientId: line.ingredientid,
        ingredient,
        quantityUsed: round(quantityInRecipeUnit, 4),
        quantityInRecipeUnit: round(quantityInRecipeUnit, 4),
        unitId: line.unitid,
        unit: unitsById[line.unitid],
        recipeUnit: unitsById[line.unitid],
        unitCost: 0,
        totalCost: 0,
        conversionFactor,
        canDeductInventory: false,
        costStatus: "uncosted",
        warning,
      });
      continue;
    }

    const unitCost = ingredient?.cost_per_unit ?? 0;
    const quantityUsed = round(quantityInIngredientUnit, 4);
    const totalCost = round(quantityUsed * unitCost, 4);

    materials.push({
      ingredientId: line.ingredientid,
      ingredient,
      quantityUsed,
      quantityInRecipeUnit: round(quantityInRecipeUnit, 4),
      unitId: ingredientUnitId,
      unit: unitsById[ingredientUnitId],
      recipeUnit: unitsById[line.unitid],
      unitCost,
      totalCost,
      conversionFactor,
      canDeductInventory: true,
      costStatus: unitCost > 0 ? "costed" : "uncosted",
      warning:
        unitCost > 0
          ? undefined
          : `Missing positive unit cost for ${ingredient?.name || "ingredient"}.`,
    });

    if (unitCost <= 0) {
      warnings.push(
        `Missing positive unit cost for ${ingredient?.name || "ingredient"}.`,
      );
    }
  }

  const materialCostTotal = round(
    materials.reduce((sum, material) => sum + (material.totalCost || 0), 0),
    4,
  );
  const laborCost = Number.isFinite(input.laborCost ?? NaN)
    ? Number(input.laborCost)
    : 0;
  const overheadCost = Number.isFinite(input.overheadCost ?? NaN)
    ? Number(input.overheadCost)
    : 0;
  const totalOutputCost = round(materialCostTotal + laborCost + overheadCost, 4);
  const costedOutputQuantity = yieldQuantityInItemUnit > 0
    ? yieldQuantityInItemUnit
    : finalProducedQuantity;
  const unitOutputCost =
    costedOutputQuantity > 0 ? round(totalOutputCost / costedOutputQuantity, 6) : null;
  const wasteCostEstimate = unitOutputCost
    ? round(wasteQuantityInItemUnit * unitOutputCost, 4)
    : 0;

  return {
    producedQuantityInItemUnit: finalProducedQuantity,
    yieldQuantityInItemUnit,
    wasteQuantityInItemUnit,
    costedOutputQuantity,
    materials,
    materialCostTotal,
    laborCost,
    overheadCost,
    totalOutputCost,
    unitOutputCost,
    wasteCostEstimate,
    canRecord: blockingIssues.length === 0,
    warnings,
    blockingIssues,
  };
}
