import type { InventoryUnit } from "@/features/inventory/hooks/types";

interface UnitMeta {
  baseUnitId: string;
  factorToBase: number;
  status: "ready" | "invalid" | "cycle" | "missing";
  message?: string;
}

type UnitIndex = Record<string, InventoryUnit>;
type UnitMetaCache = Record<string, UnitMeta | null>;

const SAFE_EPSILON = 1e-9;

const ensureUnitIndex = (units: InventoryUnit[]): UnitIndex => {
  return units.reduce<UnitIndex>((acc, unit) => {
    if (unit?.id) {
      acc[unit.id] = unit;
    }
    return acc;
  }, {});
};

const resolveUnitMeta = (
  unitId: string,
  units: UnitIndex,
  cache: UnitMetaCache,
  resolving = new Set<string>(),
): UnitMeta | null => {
  if (cache[unitId] !== undefined) {
    return cache[unitId];
  }

  if (resolving.has(unitId)) {
    cache[unitId] = {
      baseUnitId: unitId,
      factorToBase: 1,
      status: "cycle",
      message: "Unit conversion contains a cycle.",
    };
    return null;
  }

  resolving.add(unitId);

  const unit = units[unitId];
  if (!unit) {
    cache[unitId] = {
      baseUnitId: unitId,
      factorToBase: 1,
      status: "missing",
      message: "Unit is missing from the conversion catalog.",
    };
    resolving.delete(unitId);
    return null;
  }

  // Base units are the anchor of a conversion group
  if (unit.is_base_unit || (!unit.base_unitid && !unit.parent_unitid)) {
    const meta: UnitMeta = {
      baseUnitId: unit.base_unitid || unit.id,
      factorToBase: 1,
      status: "ready",
    };
    cache[unitId] = meta;
    resolving.delete(unitId);
    return meta;
  }

  // Prefer direct conversion factor to base when present
  if (unit.conversion_factor && unit.base_unitid) {
    const baseUnit = units[unit.base_unitid];
    if (!baseUnit) {
      cache[unitId] = {
        baseUnitId: unit.base_unitid,
        factorToBase: 1,
        status: "missing",
        message: "Unit base is missing from the conversion catalog.",
      };
      resolving.delete(unitId);
      return null;
    }

    if (!Number.isFinite(unit.conversion_factor) || unit.conversion_factor <= 0) {
      cache[unitId] = {
        baseUnitId: unit.base_unitid,
        factorToBase: 1,
        status: "invalid",
        message: "Unit conversion_factor must be greater than zero.",
      };
      resolving.delete(unitId);
      return null;
    }

    const meta: UnitMeta = {
      baseUnitId: unit.base_unitid,
      factorToBase: unit.conversion_factor,
      status: "ready",
    };
    cache[unitId] = meta;
    resolving.delete(unitId);
    return meta;
  }

  // Otherwise traverse parent chain if available
  if (unit.parent_unitid && unit.conversion_to_parent) {
    if (
      !Number.isFinite(unit.conversion_to_parent) ||
      unit.conversion_to_parent <= 0
    ) {
      cache[unitId] = {
        baseUnitId: unit.parent_unitid,
        factorToBase: 1,
        status: "invalid",
        message: "Unit conversion_to_parent must be greater than zero.",
      };
      resolving.delete(unitId);
      return null;
    }

    const parentMeta = resolveUnitMeta(
      unit.parent_unitid,
      units,
      cache,
      resolving,
    );
    if (parentMeta) {
      const meta: UnitMeta = {
        baseUnitId: parentMeta.baseUnitId,
        factorToBase: parentMeta.factorToBase * unit.conversion_to_parent,
        status: parentMeta.status,
        message: parentMeta.message,
      };
      cache[unitId] = meta;
      resolving.delete(unitId);
      return meta;
    }
  }

  // Fallback: treat as standalone base unit
  const fallback: UnitMeta = {
    baseUnitId: unit.base_unitid || unit.id,
    factorToBase: 1,
    status: "invalid",
    message: "Unit has no usable base or parent conversion path.",
  };
  cache[unitId] = fallback;
  resolving.delete(unitId);
  return fallback;
};

export const buildUnitMetaIndex = (units: InventoryUnit[]): UnitMetaCache => {
  const unitIndex = ensureUnitIndex(units);
  const cache: UnitMetaCache = {};

  Object.keys(unitIndex).forEach((unitId) => {
    resolveUnitMeta(unitId, unitIndex, cache);
  });

  return cache;
};

export const getConversionFactor = (
  unitMeta: UnitMetaCache,
  fromUnitId?: string | null,
  toUnitId?: string | null,
): number => {
  if (!fromUnitId || !toUnitId || fromUnitId === toUnitId) {
    return 1;
  }

  const fromMeta = unitMeta[fromUnitId];
  const toMeta = unitMeta[toUnitId];

  if (!fromMeta || !toMeta) {
    return 1;
  }

  if (fromMeta.baseUnitId !== toMeta.baseUnitId) {
    return 1;
  }

  if (Math.abs(toMeta.factorToBase) < SAFE_EPSILON) {
    return 1;
  }

  return fromMeta.factorToBase / toMeta.factorToBase;
};

export const tryGetConversionFactor = (
  unitMeta: UnitMetaCache,
  fromUnitId?: string | null,
  toUnitId?: string | null,
): { factor: number | null; reason?: string } => {
  if (!fromUnitId || !toUnitId || fromUnitId === toUnitId) {
    return { factor: 1 };
  }

  const fromMeta = unitMeta[fromUnitId];
  const toMeta = unitMeta[toUnitId];

  if (!fromMeta || fromMeta.status !== "ready") {
    return {
      factor: null,
      reason: fromMeta?.message ?? "Source unit is missing conversion metadata.",
    };
  }

  if (!toMeta || toMeta.status !== "ready") {
    return {
      factor: null,
      reason: toMeta?.message ?? "Target unit is missing conversion metadata.",
    };
  }

  if (fromMeta.baseUnitId !== toMeta.baseUnitId) {
    return {
      factor: null,
      reason: "Units do not share a conversion base.",
    };
  }

  if (Math.abs(toMeta.factorToBase) < SAFE_EPSILON) {
    return {
      factor: null,
      reason: "Target unit conversion factor is zero.",
    };
  }

  return { factor: fromMeta.factorToBase / toMeta.factorToBase };
};

export const canConvertUnits = (
  unitMeta: UnitMetaCache,
  fromUnitId?: string | null,
  toUnitId?: string | null,
) => tryGetConversionFactor(unitMeta, fromUnitId, toUnitId).factor !== null;

export const convertQuantity = (
  unitMeta: UnitMetaCache,
  quantity: number,
  fromUnitId?: string | null,
  toUnitId?: string | null,
): number => {
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  const factor = getConversionFactor(unitMeta, fromUnitId, toUnitId);
  return quantity * factor;
};

export const collectUnits = (
  sources: Array<
    InventoryUnit | undefined | null | InventoryUnit[] | undefined | null
  >,
): InventoryUnit[] => {
  const bucket: Record<string, InventoryUnit> = {};

  sources.forEach((entry) => {
    if (!entry) return;
    if (Array.isArray(entry)) {
      entry.forEach((unit) => {
        if (unit?.id) {
          bucket[unit.id] = unit;
        }
      });
    } else if (entry.id) {
      bucket[entry.id] = entry;
    }
  });

  return Object.values(bucket);
};
