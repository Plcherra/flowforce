export type MarketManMigrationObject =
  | "items"
  | "units"
  | "suppliers"
  | "purchases"
  | "recipes"
  | "counts"
  | "waste";

export type MarketManUnitDimension = "count" | "weight" | "volume";

export type MarketManMigrationDataObject = {
  key: MarketManMigrationObject;
  label: string;
  flowforceTarget: string;
  notes: string;
};

export type MarketManUnit = {
  name: string;
  abbreviation: string;
  dimension: MarketManUnitDimension;
  conversionToBase: number;
  baseUnit: string;
};

export type MarketManSupplier = {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
};

export type MarketManItem = {
  sku: string;
  name: string;
  unit: string;
  category?: string;
  supplierName?: string;
  defaultUnitCost?: number;
};

export type MarketManPurchaseLine = {
  purchaseId: string;
  supplierName: string;
  itemSku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  purchasedOn: string;
};

export type MarketManRecipeIngredient = {
  itemSku: string;
  quantity: number;
  unit: string;
};

export type MarketManRecipe = {
  recipeSku: string;
  name: string;
  yieldQuantity: number;
  yieldUnit: string;
  ingredients: MarketManRecipeIngredient[];
};

export type MarketManCountLine = {
  itemSku: string;
  quantity: number;
  unit: string;
  countedOn: string;
  location?: string;
};

export type MarketManWasteLine = {
  itemSku: string;
  quantity: number;
  unit: string;
  reason: string;
  wastedOn: string;
};

export type MarketManMigrationDataset = {
  units: readonly MarketManUnit[];
  suppliers: readonly MarketManSupplier[];
  items: readonly MarketManItem[];
  purchases: readonly MarketManPurchaseLine[];
  recipes: readonly MarketManRecipe[];
  counts: readonly MarketManCountLine[];
  waste: readonly MarketManWasteLine[];
};

export type MarketManMigrationIssue = {
  object: MarketManMigrationObject;
  identifier: string;
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type MarketManCostBasis = {
  itemSku: string;
  unit: string;
  unitCost: number;
  basisSource: "weighted_purchase_average" | "default_item_cost";
  purchaseLineCount: number;
};

export type MarketManRecipeCostPreview = {
  recipeSku: string;
  name: string;
  totalCost: number;
  yieldQuantity: number;
  yieldUnit: string;
  costPerYieldUnit: number;
  issues: MarketManMigrationIssue[];
};

export type MarketManWasteCostPreview = {
  itemSku: string;
  quantityInItemUnit: number;
  costImpact: number;
};

export type MarketManInventorySetupCompletenessReport = {
  source: "marketman_export";
  readyForTenantImport: boolean;
  importedObjects: Record<MarketManMigrationObject, number>;
  unitConversionReady: boolean;
  costBasisReady: boolean;
  recipeCostingReady: boolean;
  countImportReady: boolean;
  wasteImportReady: boolean;
  issues: MarketManMigrationIssue[];
  costBasis: MarketManCostBasis[];
  recipePreviews: MarketManRecipeCostPreview[];
  wastePreviews: MarketManWasteCostPreview[];
  nextActions: string[];
};

export const marketManMigrationDataObjects: MarketManMigrationDataObject[] = [
  {
    key: "items",
    label: "Items",
    flowforceTarget: "inv_items",
    notes:
      "Import SKU, name, category, base unit, preferred supplier, and fallback unit cost.",
  },
  {
    key: "units",
    label: "Units",
    flowforceTarget: "inv_units",
    notes:
      "Import unit dimension and conversion factor before purchases, recipes, counts, or waste.",
  },
  {
    key: "suppliers",
    label: "Suppliers",
    flowforceTarget: "inv_suppliers",
    notes:
      "Import supplier identity and contact metadata before purchase history.",
  },
  {
    key: "purchases",
    label: "Purchases",
    flowforceTarget: "inv_purchases, inv_purchase_lines, inv_stock_lots",
    notes:
      "Purchase quantities and unit costs create weighted cost basis for item costing.",
  },
  {
    key: "recipes",
    label: "Recipes",
    flowforceTarget: "inv_recipes and production costing",
    notes:
      "Recipe ingredient quantities must convert into each ingredient item unit before cost calculation.",
  },
  {
    key: "counts",
    label: "Counts",
    flowforceTarget: "inv_counts and inv_count_lines",
    notes:
      "Imported stock counts must convert into item base units for stock-position accuracy.",
  },
  {
    key: "waste",
    label: "Waste",
    flowforceTarget: "inv_waste and cost_waste_daily_v",
    notes:
      "Waste quantities must convert into item base units and use item cost basis for cost impact.",
  },
] as const;

export const marketManTemplateMapping = {
  units: {
    name: ["Unit", "Unit name", "UOM"],
    abbreviation: ["Abbreviation", "Code", "UOM code"],
    dimension: ["Dimension", "Type"],
    conversionToBase: ["Conversion to base", "Factor", "Base factor"],
  },
  items: {
    sku: ["SKU", "Item code", "Product code"],
    name: ["Item", "Item name", "Product"],
    unit: ["Unit", "Base unit", "Inventory unit"],
    category: ["Category", "Group"],
    supplierName: ["Supplier", "Vendor"],
    defaultUnitCost: ["Cost", "Default cost", "Unit cost"],
  },
  purchases: {
    purchaseId: ["Purchase ID", "Invoice", "PO number"],
    supplierName: ["Supplier", "Vendor"],
    itemSku: ["SKU", "Item code"],
    quantity: ["Quantity", "Qty"],
    unit: ["Unit", "Purchase unit"],
    unitCost: ["Unit cost", "Price"],
    purchasedOn: ["Date", "Purchase date", "Received date"],
  },
  recipes: {
    recipeSku: ["Recipe SKU", "Menu item code"],
    ingredientSku: ["Ingredient SKU", "Item code"],
    quantity: ["Quantity", "Ingredient quantity"],
    unit: ["Unit", "Ingredient unit"],
    yieldQuantity: ["Yield", "Yield quantity"],
    yieldUnit: ["Yield unit", "Portion unit"],
  },
} as const;

export const sampleMarketManExport: MarketManMigrationDataset = {
  units: [
    {
      name: "Pound",
      abbreviation: "lb",
      dimension: "weight",
      conversionToBase: 1,
      baseUnit: "lb",
    },
    {
      name: "Ounce",
      abbreviation: "oz",
      dimension: "weight",
      conversionToBase: 0.0625,
      baseUnit: "lb",
    },
    {
      name: "Each",
      abbreviation: "ea",
      dimension: "count",
      conversionToBase: 1,
      baseUnit: "ea",
    },
    {
      name: "Case",
      abbreviation: "case",
      dimension: "count",
      conversionToBase: 12,
      baseUnit: "ea",
    },
  ],
  suppliers: [
    {
      name: "Fresh Farms",
      contactName: "Ana Silva",
      email: "orders@freshfarms.example",
      phone: "+1 555 0100",
    },
  ],
  items: [
    {
      sku: "TOMATO",
      name: "Tomatoes",
      unit: "lb",
      category: "Produce",
      supplierName: "Fresh Farms",
    },
    {
      sku: "BUN",
      name: "Burger bun",
      unit: "ea",
      category: "Bread",
      supplierName: "Fresh Farms",
      defaultUnitCost: 0.48,
    },
  ],
  purchases: [
    {
      purchaseId: "PO-100",
      supplierName: "Fresh Farms",
      itemSku: "TOMATO",
      quantity: 160,
      unit: "oz",
      unitCost: 0.14,
      purchasedOn: "2026-05-29",
    },
    {
      purchaseId: "PO-101",
      supplierName: "Fresh Farms",
      itemSku: "BUN",
      quantity: 2,
      unit: "case",
      unitCost: 5.76,
      purchasedOn: "2026-05-29",
    },
  ],
  recipes: [
    {
      recipeSku: "BURGER",
      name: "House burger",
      yieldQuantity: 1,
      yieldUnit: "ea",
      ingredients: [
        {
          itemSku: "TOMATO",
          quantity: 2,
          unit: "oz",
        },
        {
          itemSku: "BUN",
          quantity: 1,
          unit: "ea",
        },
      ],
    },
  ],
  counts: [
    {
      itemSku: "TOMATO",
      quantity: 8,
      unit: "lb",
      countedOn: "2026-05-30",
      location: "Main",
    },
  ],
  waste: [
    {
      itemSku: "TOMATO",
      quantity: 8,
      unit: "oz",
      reason: "spoilage",
      wastedOn: "2026-05-30",
    },
  ],
} as const;

export function validateMarketManUnitConversions(
  dataset: MarketManMigrationDataset,
) {
  const issues: MarketManMigrationIssue[] = [];
  const seenUnits = new Set<string>();

  dataset.units.forEach((unit) => {
    const unitKey = normalizeUnitKey(unit.abbreviation);
    if (!unitKey) {
      issues.push(
        issue(
          "units",
          unit.name,
          "error",
          "missing_unit_code",
          "Unit abbreviation is required.",
        ),
      );
    }
    if (seenUnits.has(unitKey)) {
      issues.push(
        issue(
          "units",
          unit.abbreviation,
          "error",
          "duplicate_unit",
          "Unit abbreviations must be unique.",
        ),
      );
    }
    seenUnits.add(unitKey);

    if (unit.conversionToBase <= 0) {
      issues.push(
        issue(
          "units",
          unit.abbreviation,
          "error",
          "invalid_conversion_factor",
          "Unit conversion factor must be positive.",
        ),
      );
    }

    const baseUnit = findUnit(dataset, unit.baseUnit);
    if (unit.baseUnit && baseUnit && baseUnit.dimension !== unit.dimension) {
      issues.push(
        issue(
          "units",
          unit.abbreviation,
          "error",
          "unit_dimension_mismatch",
          "Unit and base unit dimensions must match.",
        ),
      );
    }
  });

  dataset.items.forEach((item) => {
    if (!findUnit(dataset, item.unit)) {
      issues.push(
        issue(
          "items",
          item.sku,
          "error",
          "missing_item_unit",
          "Item base unit must exist in imported units.",
        ),
      );
    }
  });

  return issues;
}

export function buildMarketManCostBasis(dataset: MarketManMigrationDataset) {
  const issues: MarketManMigrationIssue[] = [];
  const costBasis = dataset.items.map((item): MarketManCostBasis | null => {
    const purchaseLines = dataset.purchases.filter(
      (purchase) => purchase.itemSku === item.sku,
    );
    const convertedLines = purchaseLines.flatMap((purchase) => {
      if (purchase.quantity <= 0) {
        issues.push(
          issue(
            "purchases",
            purchase.purchaseId,
            "error",
            "invalid_purchase_quantity",
            "Purchase quantity must be positive.",
          ),
        );
        return [];
      }
      if (purchase.unitCost < 0) {
        issues.push(
          issue(
            "purchases",
            purchase.purchaseId,
            "error",
            "invalid_purchase_unit_cost",
            "Purchase unit cost cannot be negative.",
          ),
        );
        return [];
      }

      const convertedQuantity = convertQuantity(
        dataset,
        purchase.quantity,
        purchase.unit,
        item.unit,
        "purchases",
        purchase.purchaseId,
        issues,
      );
      if (convertedQuantity === null) {
        return [];
      }

      return [
        {
          quantity: convertedQuantity,
          totalCost: purchase.quantity * purchase.unitCost,
        },
      ];
    });

    const totalQuantity = convertedLines.reduce(
      (total, line) => total + line.quantity,
      0,
    );
    const totalCost = convertedLines.reduce(
      (total, line) => total + line.totalCost,
      0,
    );

    if (totalQuantity > 0) {
      return {
        itemSku: item.sku,
        unit: item.unit,
        unitCost: roundCurrency(totalCost / totalQuantity),
        basisSource: "weighted_purchase_average",
        purchaseLineCount: convertedLines.length,
      };
    }

    if (typeof item.defaultUnitCost === "number" && item.defaultUnitCost >= 0) {
      return {
        itemSku: item.sku,
        unit: item.unit,
        unitCost: roundCurrency(item.defaultUnitCost),
        basisSource: "default_item_cost",
        purchaseLineCount: 0,
      };
    }

    issues.push(
      issue(
        "items",
        item.sku,
        "error",
        "missing_cost_basis",
        "Item needs purchase history or a non-negative default unit cost.",
      ),
    );
    return null;
  });

  return {
    costBasis: costBasis.filter((basis): basis is MarketManCostBasis =>
      Boolean(basis),
    ),
    issues,
  };
}

export function buildMarketManRecipeCostPreview(
  dataset: MarketManMigrationDataset,
  recipe: MarketManRecipe,
): MarketManRecipeCostPreview {
  const issues: MarketManMigrationIssue[] = [];
  const basisBySku = new Map(
    buildMarketManCostBasis(dataset).costBasis.map((basis) => [
      basis.itemSku,
      basis,
    ]),
  );
  const totalCost = recipe.ingredients.reduce((total, ingredient) => {
    const item = findItem(dataset, ingredient.itemSku);
    const basis = basisBySku.get(ingredient.itemSku);
    if (!item || !basis) {
      issues.push(
        issue(
          "recipes",
          recipe.recipeSku,
          "error",
          "missing_ingredient_cost_basis",
          `Ingredient ${ingredient.itemSku} needs item and cost basis.`,
        ),
      );
      return total;
    }

    const convertedQuantity = convertQuantity(
      dataset,
      ingredient.quantity,
      ingredient.unit,
      item.unit,
      "recipes",
      `${recipe.recipeSku}:${ingredient.itemSku}`,
      issues,
    );

    return convertedQuantity === null
      ? total
      : total + convertedQuantity * basis.unitCost;
  }, 0);

  if (recipe.yieldQuantity <= 0) {
    issues.push(
      issue(
        "recipes",
        recipe.recipeSku,
        "error",
        "invalid_recipe_yield",
        "Recipe yield quantity must be positive.",
      ),
    );
  }

  return {
    recipeSku: recipe.recipeSku,
    name: recipe.name,
    totalCost: roundCurrency(totalCost),
    yieldQuantity: recipe.yieldQuantity,
    yieldUnit: recipe.yieldUnit,
    costPerYieldUnit:
      recipe.yieldQuantity > 0
        ? roundCurrency(totalCost / recipe.yieldQuantity)
        : 0,
    issues,
  };
}

export function buildMarketManWasteCostPreview(
  dataset: MarketManMigrationDataset,
  wasteLine: MarketManWasteLine,
): MarketManWasteCostPreview | null {
  const issues: MarketManMigrationIssue[] = [];
  const item = findItem(dataset, wasteLine.itemSku);
  const basis = buildMarketManCostBasis(dataset).costBasis.find(
    (costBasis) => costBasis.itemSku === wasteLine.itemSku,
  );
  if (!item || !basis) {
    return null;
  }

  const convertedQuantity = convertQuantity(
    dataset,
    wasteLine.quantity,
    wasteLine.unit,
    item.unit,
    "waste",
    wasteLine.itemSku,
    issues,
  );
  if (convertedQuantity === null) {
    return null;
  }

  return {
    itemSku: wasteLine.itemSku,
    quantityInItemUnit: convertedQuantity,
    costImpact: roundCurrency(convertedQuantity * basis.unitCost),
  };
}

export function buildMarketManInventorySetupCompletenessReport(
  dataset: MarketManMigrationDataset,
): MarketManInventorySetupCompletenessReport {
  const unitIssues = validateMarketManUnitConversions(dataset);
  const costBasisResult = buildMarketManCostBasis(dataset);
  const recipePreviews = dataset.recipes.map((recipe) =>
    buildMarketManRecipeCostPreview(dataset, recipe),
  );
  const wastePreviews = dataset.waste
    .map((wasteLine) => buildMarketManWasteCostPreview(dataset, wasteLine))
    .filter((preview): preview is MarketManWasteCostPreview =>
      Boolean(preview),
    );
  const countIssues = validateCountLines(dataset);
  const allIssues = [
    ...unitIssues,
    ...costBasisResult.issues,
    ...recipePreviews.flatMap((preview) => preview.issues),
    ...countIssues,
  ];
  const hasErrors = allIssues.some(
    (migrationIssue) => migrationIssue.severity === "error",
  );
  const unitConversionReady = !unitIssues.some(
    (migrationIssue) => migrationIssue.severity === "error",
  );
  const costBasisReady =
    costBasisResult.costBasis.length === dataset.items.length &&
    !costBasisResult.issues.some(
      (migrationIssue) => migrationIssue.severity === "error",
    );
  const recipeCostingReady =
    recipePreviews.length === dataset.recipes.length &&
    recipePreviews.every((preview) =>
      preview.issues.every(
        (migrationIssue) => migrationIssue.severity !== "error",
      ),
    );
  const countImportReady =
    dataset.counts.length > 0 &&
    countIssues.every((migrationIssue) => migrationIssue.severity !== "error");
  const wasteImportReady = wastePreviews.length === dataset.waste.length;

  return {
    source: "marketman_export",
    readyForTenantImport:
      !hasErrors &&
      unitConversionReady &&
      costBasisReady &&
      recipeCostingReady &&
      countImportReady &&
      wasteImportReady,
    importedObjects: {
      items: dataset.items.length,
      units: dataset.units.length,
      suppliers: dataset.suppliers.length,
      purchases: dataset.purchases.length,
      recipes: dataset.recipes.length,
      counts: dataset.counts.length,
      waste: dataset.waste.length,
    },
    unitConversionReady,
    costBasisReady,
    recipeCostingReady,
    countImportReady,
    wasteImportReady,
    issues: allIssues,
    costBasis: costBasisResult.costBasis,
    recipePreviews,
    wastePreviews,
    nextActions: [
      "Create or confirm imported units before importing item quantities.",
      "Review weighted cost basis before enabling recipe and waste cost reports.",
      "Confirm supplier identity and purchase history before stock-lot creation.",
      "Run an inventory setup completeness review before customer cutover.",
    ],
  };
}

export function isMarketManMigrationPathReady() {
  const objects = new Set(
    marketManMigrationDataObjects.map((object) => object.key),
  );
  const report = buildMarketManInventorySetupCompletenessReport(
    sampleMarketManExport,
  );
  const burgerPreview = report.recipePreviews.find(
    (preview) => preview.recipeSku === "BURGER",
  );
  const tomatoWaste = report.wastePreviews.find(
    (preview) => preview.itemSku === "TOMATO",
  );

  return (
    objects.has("items") &&
    objects.has("units") &&
    objects.has("suppliers") &&
    objects.has("purchases") &&
    objects.has("recipes") &&
    objects.has("counts") &&
    objects.has("waste") &&
    report.readyForTenantImport &&
    report.unitConversionReady &&
    report.costBasisReady &&
    report.recipeCostingReady &&
    Number(burgerPreview?.costPerYieldUnit.toFixed(2)) === 0.76 &&
    Number(tomatoWaste?.costImpact.toFixed(2)) === 1.12
  );
}

function validateCountLines(dataset: MarketManMigrationDataset) {
  const issues: MarketManMigrationIssue[] = [];
  dataset.counts.forEach((countLine) => {
    const item = findItem(dataset, countLine.itemSku);
    if (!item) {
      issues.push(
        issue(
          "counts",
          countLine.itemSku,
          "error",
          "missing_count_item",
          "Count line item must exist.",
        ),
      );
      return;
    }
    if (countLine.quantity < 0) {
      issues.push(
        issue(
          "counts",
          countLine.itemSku,
          "error",
          "invalid_count_quantity",
          "Count quantity cannot be negative.",
        ),
      );
    }
    convertQuantity(
      dataset,
      countLine.quantity,
      countLine.unit,
      item.unit,
      "counts",
      countLine.itemSku,
      issues,
    );
  });
  return issues;
}

function convertQuantity(
  dataset: MarketManMigrationDataset,
  quantity: number,
  fromUnitKey: string,
  toUnitKey: string,
  object: MarketManMigrationObject,
  identifier: string,
  issues: MarketManMigrationIssue[],
) {
  const fromUnit = findUnit(dataset, fromUnitKey);
  const toUnit = findUnit(dataset, toUnitKey);

  if (!fromUnit || !toUnit) {
    issues.push(
      issue(
        object,
        identifier,
        "error",
        "missing_conversion_unit",
        "Both source and target units must exist.",
      ),
    );
    return null;
  }

  if (fromUnit.dimension !== toUnit.dimension) {
    issues.push(
      issue(
        object,
        identifier,
        "error",
        "unit_dimension_mismatch",
        "Source and target units must share a dimension.",
      ),
    );
    return null;
  }

  return (quantity * fromUnit.conversionToBase) / toUnit.conversionToBase;
}

function findUnit(dataset: MarketManMigrationDataset, unitKey: string) {
  const normalized = normalizeUnitKey(unitKey);
  return dataset.units.find(
    (unit) =>
      normalizeUnitKey(unit.abbreviation) === normalized ||
      normalizeUnitKey(unit.name) === normalized,
  );
}

function findItem(dataset: MarketManMigrationDataset, sku: string) {
  return dataset.items.find((item) => item.sku === sku);
}

function normalizeUnitKey(unitKey: string | undefined) {
  return String(unitKey ?? "")
    .trim()
    .toLowerCase();
}

function issue(
  object: MarketManMigrationObject,
  identifier: string,
  severity: MarketManMigrationIssue["severity"],
  code: string,
  message: string,
): MarketManMigrationIssue {
  return { object, identifier, severity, code, message };
}

function roundCurrency(value: number) {
  return Math.round(value * 10000) / 10000;
}
