import type { InventoryUnit } from '@/hooks/inventory/types';

interface UnitMeta {
  baseUnitId: string;
  factorToBase: number;
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
  cache: UnitMetaCache
): UnitMeta | null => {
  if (cache[unitId] !== undefined) {
    return cache[unitId];
  }

  const unit = units[unitId];
  if (!unit) {
    cache[unitId] = null;
    return null;
  }

  // Base units are the anchor of a conversion group
  if (unit.is_base_unit || (!unit.base_unit_id && !unit.parent_unit_id)) {
    const meta: UnitMeta = {
      baseUnitId: unit.base_unit_id || unit.id,
      factorToBase: 1,
    };
    cache[unitId] = meta;
    return meta;
  }

  // Prefer direct conversion factor to base when present
  if (unit.conversion_factor && unit.base_unit_id) {
    const meta: UnitMeta = {
      baseUnitId: unit.base_unit_id,
      factorToBase: unit.conversion_factor,
    };
    cache[unitId] = meta;
    return meta;
  }

  // Otherwise traverse parent chain if available
  if (unit.parent_unit_id && unit.conversion_to_parent) {
    const parentMeta = resolveUnitMeta(unit.parent_unit_id, units, cache);
    if (parentMeta) {
      const meta: UnitMeta = {
        baseUnitId: parentMeta.baseUnitId,
        factorToBase: parentMeta.factorToBase * unit.conversion_to_parent,
      };
      cache[unitId] = meta;
      return meta;
    }
  }

  // Fallback: treat as standalone base unit
  const fallback: UnitMeta = {
    baseUnitId: unit.base_unit_id || unit.id,
    factorToBase: 1,
  };
  cache[unitId] = fallback;
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
  toUnitId?: string | null
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

export const convertQuantity = (
  unitMeta: UnitMetaCache,
  quantity: number,
  fromUnitId?: string | null,
  toUnitId?: string | null
): number => {
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  const factor = getConversionFactor(unitMeta, fromUnitId, toUnitId);
  return quantity * factor;
};

export const collectUnits = (
  sources: Array<InventoryUnit | undefined | null | InventoryUnit[] | undefined | null>
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
