import { describe, expect, it, vi } from "vitest";
import type { InventoryItem } from "@/features/inventory/hooks/types";
import {
  submitWasteForm,
  processAdjustmentForm,
  type WasteFormValues,
  type AdjustmentFormValues,
  wasteTypes,
} from "../inventoryActionsHelpers";

const buildWasteForm = (
  overrides: Partial<WasteFormValues> = {},
): WasteFormValues => ({
  item_id: "",
  location_id: "",
  quantity: "",
  waste_type: "" as (typeof wasteTypes)[number]["value"] | "",
  reason: "",
  ...overrides,
});

const buildAdjustmentForm = (
  overrides: Partial<AdjustmentFormValues> = {},
): AdjustmentFormValues => ({
  item_id: "",
  location_id: "",
  adjustment_type: "",
  quantity: "",
  reason: "",
  ...overrides,
});

const items: InventoryItem[] = [
  {
    id: "item-1",
    company_id: "company-1",
    name: "Tomatoes",
    unit_id: "unit-1",
    unit: {
      id: "unit-1",
      name: "Case",
      abbreviation: "cs",
      unit_type: "count",
      is_active: true,
    },
    cost_per_unit: 3.5,
    min_stock_level: 1,
    max_stock_level: 5,
    default_location_id: "loc-1",
    is_active: true,
    created_by: "user-1",
    created_at: "",
    updated_at: "",
  } as InventoryItem,
];

describe("inventoryActions.helpers", () => {
  it("submits waste form with normalized cost impact", async () => {
    const mutateWaste = vi.fn().mockResolvedValue(undefined);
    const setErrors = vi.fn();
    const showValidationToast = vi.fn();
    const resetForm = vi.fn();

    const form = buildWasteForm({
      item_id: "item-1",
      location_id: "loc-1",
      quantity: "2.5",
      waste_type: "spoilage",
    });

    const result = await submitWasteForm({
      form,
      items,
      setErrors,
      showValidationToast,
      resetForm,
      mutateWaste,
    });

    expect(result).toBe("success");
    expect(mutateWaste).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: "item-1",
        quantity: 2.5,
        cost_impact: 8.75,
        waste_type: "spoilage",
      }),
    );
    expect(resetForm).toHaveBeenCalled();
    expect(setErrors).not.toHaveBeenCalled();
    expect(showValidationToast).not.toHaveBeenCalled();
  });

  it("prevents submission when waste type is invalid", async () => {
    const mutateWaste = vi.fn();
    const setErrors = vi.fn();
    const showValidationToast = vi.fn();
    const resetForm = vi.fn();

    const form = buildWasteForm({
      item_id: "item-1",
      quantity: "1",
      waste_type: "invalid" as WasteFormValues["waste_type"],
    });

    const result = await submitWasteForm({
      form,
      items,
      setErrors,
      showValidationToast,
      resetForm,
      mutateWaste,
    });

    expect(result).toBe("validation_error");
    expect(mutateWaste).not.toHaveBeenCalled();
    expect(setErrors).toHaveBeenCalledWith(
      expect.objectContaining({
        waste_type: "Choose the type of waste.",
      }),
    );
    expect(showValidationToast).toHaveBeenCalled();
    expect(resetForm).not.toHaveBeenCalled();
  });

  it("maps adjustment validation errors to the right fields", () => {
    const setErrors = vi.fn();
    const showValidationToast = vi.fn();

    const form = buildAdjustmentForm({
      item_id: "",
      location_id: "",
      adjustment_type: "",
      quantity: "-2",
      reason: "",
    });

    const result = processAdjustmentForm({
      form,
      setErrors,
      showValidationToast,
    });

    expect(result).toBe("validation_error");
    expect(setErrors).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: "Select an item to adjust.",
        location_id: "Select a location.",
        adjustment_type: "Choose an adjustment type.",
        quantity: "Quantity must be greater than zero.",
        reason: "Provide a brief reason.",
      }),
    );
    expect(showValidationToast).toHaveBeenCalled();
  });
});
