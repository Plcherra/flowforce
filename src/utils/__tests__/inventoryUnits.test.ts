import { describe, it, expect } from "vitest";
import {
  getConversionFactor,
  convertQuantity,
  buildUnitMetaIndex,
} from "../inventoryUnits";
import type { InventoryUnit } from "@/types/inventory";

describe("inventoryUnits utilities", () => {
  const mockUnits: InventoryUnit[] = [
    {
      id: "unit-1",
      name: "Base Unit",
      is_base_unit: true,
      conversion_factor: 1,
      base_unit_id: "unit-1",
    },
    {
      id: "unit-2",
      name: "Derived Unit",
      is_base_unit: false,
      conversion_factor: 2,
      base_unit_id: "unit-1",
    },
    {
      id: "unit-3",
      name: "Another Derived",
      is_base_unit: false,
      conversion_factor: 0.5,
      base_unit_id: "unit-1",
    },
  ];

  describe("buildUnitMetaIndex", () => {
    it("should build unit meta index correctly", () => {
      const index = buildUnitMetaIndex(mockUnits);
      expect(index["unit-1"]).toBeDefined();
      expect(index["unit-2"]).toBeDefined();
      expect(index["unit-3"]).toBeDefined();
    });
  });

  describe("getConversionFactor", () => {
    it("should return 1 for same unit", () => {
      const meta = buildUnitMetaIndex(mockUnits);
      const factor = getConversionFactor(meta, "unit-1", "unit-1");
      expect(factor).toBe(1);
    });

    it("should return correct conversion factor between units", () => {
      const meta = buildUnitMetaIndex(mockUnits);
      const factor = getConversionFactor(meta, "unit-2", "unit-1");
      expect(factor).toBe(2);
    });

    it("should return 1 for missing units", () => {
      const meta = buildUnitMetaIndex(mockUnits);
      const factor = getConversionFactor(meta, "missing", "unit-1");
      expect(factor).toBe(1);
    });
  });

  describe("convertQuantity", () => {
    it("should convert quantity correctly", () => {
      const meta = buildUnitMetaIndex(mockUnits);
      const converted = convertQuantity(meta, 10, "unit-2", "unit-1");
      expect(converted).toBe(20);
    });

    it("should return 0 for non-finite quantities", () => {
      const meta = buildUnitMetaIndex(mockUnits);
      const converted = convertQuantity(meta, Infinity, "unit-1", "unit-2");
      expect(converted).toBe(0);
    });

    it("should return same value for same unit", () => {
      const meta = buildUnitMetaIndex(mockUnits);
      const converted = convertQuantity(meta, 10, "unit-1", "unit-1");
      expect(converted).toBe(10);
    });
  });
});
