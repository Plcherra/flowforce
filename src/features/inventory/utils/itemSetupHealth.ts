import type { InventoryItem } from "@/features/inventory/hooks/types";
import { canConvertUnits, type buildUnitMetaIndex } from "@/utils/inventoryUnits";

export type InventorySetupIssueSeverity = "blocking" | "warning";

export type InventorySetupIssue = {
  code:
    | "missing_unit"
    | "missing_cost"
    | "missing_location"
    | "missing_supplier"
    | "missing_category"
    | "missing_countable_unit"
    | "missing_primary_unit"
    | "invalid_item_unit_conversion"
    | "invalid_recipe_conversion"
    | "invalid_unit_cost";
  severity: InventorySetupIssueSeverity;
  message: string;
};

export type InventorySetupHealth = {
  status: "ready" | "warning" | "incomplete";
  score: number;
  issues: InventorySetupIssue[];
  blockingCount: number;
  warningCount: number;
};

type UnitMeta = ReturnType<typeof buildUnitMetaIndex>;

const isPositiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const addIssue = (
  issues: InventorySetupIssue[],
  issue: InventorySetupIssue,
) => {
  if (!issues.some((entry) => entry.code === issue.code)) {
    issues.push(issue);
  }
};

export function buildInventoryItemSetupHealth(
  item: InventoryItem,
  unitMeta: UnitMeta,
): InventorySetupHealth {
  const issues: InventorySetupIssue[] = [];
  const itemUnits = item.units ?? [];

  if (!item.unit_id || !item.unit) {
    addIssue(issues, {
      code: "missing_unit",
      severity: "blocking",
      message: "Item needs a primary inventory unit.",
    });
  }

  const costCandidates = [
    item.cost_per_unit,
    item.calculated_cost_per_unit,
    item.recipe_cost_per_unit,
    ...itemUnits.map((unit) => unit.cost_per_unit),
  ];
  if (!costCandidates.some(isPositiveNumber)) {
    addIssue(issues, {
      code: "missing_cost",
      severity: "blocking",
      message: "Item needs a positive cost basis.",
    });
  }

  if (!item.default_location_id && !item.location) {
    addIssue(issues, {
      code: "missing_location",
      severity: "warning",
      message: "Item should have a default location for counts and stock value.",
    });
  }

  if (!item.preferred_supplier_id && !item.preferred_supplier) {
    addIssue(issues, {
      code: "missing_supplier",
      severity: "warning",
      message: "Item should have a preferred supplier for purchasing cost.",
    });
  }

  if (!item.category_id && !item.category_details && !item.category) {
    addIssue(issues, {
      code: "missing_category",
      severity: "warning",
      message: "Item should have a category for reporting.",
    });
  }

  if (itemUnits.length > 0) {
    if (!itemUnits.some((unit) => unit.is_primary)) {
      addIssue(issues, {
        code: "missing_primary_unit",
        severity: "blocking",
        message: "Item unit hierarchy needs one primary unit.",
      });
    }

    if (!itemUnits.some((unit) => unit.is_countable !== false)) {
      addIssue(issues, {
        code: "missing_countable_unit",
        severity: "blocking",
        message: "Item needs at least one countable unit.",
      });
    }
  }

  for (const itemUnit of itemUnits) {
    if (
      !Number.isFinite(itemUnit.conversion_factor) ||
      itemUnit.conversion_factor <= 0
    ) {
      addIssue(issues, {
        code: "invalid_item_unit_conversion",
        severity: "blocking",
        message: "Item unit conversion factors must be greater than zero.",
      });
    }

    if (
      item.unit_id &&
      itemUnit.unit_id &&
      itemUnit.unit_id !== item.unit_id &&
      !canConvertUnits(unitMeta, itemUnit.unit_id, item.unit_id)
    ) {
      addIssue(issues, {
        code: "invalid_item_unit_conversion",
        severity: "blocking",
        message: "Item unit hierarchy contains units that cannot convert to the item unit.",
      });
    }

    if (
      itemUnit.cost_per_unit != null &&
      (!Number.isFinite(itemUnit.cost_per_unit) || itemUnit.cost_per_unit < 0)
    ) {
      addIssue(issues, {
        code: "invalid_unit_cost",
        severity: "blocking",
        message: "Item unit costs cannot be negative or invalid.",
      });
    }
  }

  for (const recipe of item.recipes ?? []) {
    for (const line of recipe.lines ?? []) {
      const ingredientUnitId = line.ingredient?.unit_id;
      if (
        line.unit_id &&
        ingredientUnitId &&
        line.unit_id !== ingredientUnitId &&
        !canConvertUnits(unitMeta, line.unit_id, ingredientUnitId)
      ) {
        addIssue(issues, {
          code: "invalid_recipe_conversion",
          severity: "blocking",
          message: "Recipe uses units that cannot convert to the ingredient unit.",
        });
      }
    }
  }

  const blockingCount = issues.filter(
    (issue) => issue.severity === "blocking",
  ).length;
  const warningCount = issues.length - blockingCount;
  const penalty = blockingCount * 25 + warningCount * 10;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    status: blockingCount > 0 ? "incomplete" : warningCount > 0 ? "warning" : "ready",
    score,
    issues,
    blockingCount,
    warningCount,
  };
}

export function summarizeSetupHealth(items: InventoryItem[]) {
  const ready = items.filter((item) => item.setup_health?.status === "ready").length;
  const warning = items.filter(
    (item) => item.setup_health?.status === "warning",
  ).length;
  const incomplete = items.filter(
    (item) => item.setup_health?.status === "incomplete",
  ).length;

  return {
    total: items.length,
    ready,
    warning,
    incomplete,
    readyPercent: items.length ? Math.round((ready / items.length) * 100) : 0,
  };
}
