type ItemWriteInput = Record<string, unknown>;

const ITEM_WRITE_OMIT = new Set([
  "unitid",
  "categoryid",
  "isprep_item",
  "recipe_yield_unitid",
  "barcode",
  "unit",
  "location",
  "units",
  "recipes",
  "category_details",
  "preferred_supplier",
  "recipe_yield_unit",
  "calculated_cost_per_unit",
  "recipe_cost_per_unit",
  "setup_health",
]);

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

export function toInventoryItemWrite(payload: ItemWriteInput) {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (ITEM_WRITE_OMIT.has(key)) continue;
    next[key] = value;
  }

  if ("unitid" in payload) next.unit_id = emptyToNull(payload.unitid);
  if ("categoryid" in payload) next.category_id = emptyToNull(payload.categoryid);
  if ("isprep_item" in payload) next.is_prep_item = payload.isprep_item ?? false;
  if ("recipe_yield_unitid" in payload) {
    next.recipe_yield_unit_id = emptyToNull(payload.recipe_yield_unitid);
  }

  return next;
}

export function fromInventoryItemRow<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    unitid: (row.unitid ?? row.unit_id ?? "") as string,
    categoryid: (row.categoryid ?? row.category_id ?? null) as string | null,
    isprep_item: Boolean(row.isprep_item ?? row.is_prep_item),
    recipe_yield_unitid: (row.recipe_yield_unitid ??
      row.recipe_yield_unit_id ??
      null) as string | null,
  };
}

export function toInventoryItemUnitWrite(payload: ItemWriteInput) {
  const { unitid, ...rest } = payload;
  return {
    ...rest,
    ...(unitid !== undefined ? { unit_id: emptyToNull(unitid) } : {}),
  };
}

export function fromInventoryItemUnitRow<T extends Record<string, unknown>>(
  row: T,
) {
  return {
    ...row,
    unitid: (row.unitid ?? row.unit_id ?? "") as string,
  };
}
