import type { InventoryItem } from "@/features/inventory/hooks/types";
import type { CreateWasteData } from "@/features/inventory/hooks/useInventoryWaste";

export const wasteTypes = [
  { value: "spoilage", label: "Spoilage" },
  { value: "prep_error", label: "Prep Error" },
  { value: "accident", label: "Accident" },
  { value: "theft", label: "Theft" },
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other" },
] as const;

export type WasteTypeValue = (typeof wasteTypes)[number]["value"];

export const isWasteTypeValue = (value: string): value is WasteTypeValue =>
  wasteTypes.some((type) => type.value === value);

export type WasteFormValues = {
  item_id: string;
  location_id: string;
  quantity: string;
  waste_type: WasteTypeValue | "";
  reason: string;
};

export type AdjustmentFormValues = {
  item_id: string;
  location_id: string;
  adjustment_type: string;
  quantity: string;
  reason: string;
};

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export function validateWasteForm(
  form: WasteFormValues,
): FormErrors<WasteFormValues> {
  const errors: FormErrors<WasteFormValues> = {};

  if (!form.item_id) errors.item_id = "Select an item to log waste.";

  const quantityValue = Number(form.quantity);
  if (!form.quantity || !Number.isFinite(quantityValue) || quantityValue <= 0) {
    errors.quantity = "Quantity must be greater than zero.";
  }

  if (!form.waste_type || !isWasteTypeValue(form.waste_type)) {
    errors.waste_type = "Choose the type of waste.";
  }

  return errors;
}

export function validateAdjustmentForm(
  form: AdjustmentFormValues,
): FormErrors<AdjustmentFormValues> {
  const errors: FormErrors<AdjustmentFormValues> = {};

  if (!form.item_id) errors.item_id = "Select an item to adjust.";
  if (!form.location_id) errors.location_id = "Select a location.";
  if (!form.adjustment_type)
    errors.adjustment_type = "Choose an adjustment type.";

  const quantityValue = Number(form.quantity);
  if (!form.quantity || !Number.isFinite(quantityValue) || quantityValue <= 0) {
    errors.quantity = "Quantity must be greater than zero.";
  }

  if (!form.reason) errors.reason = "Provide a brief reason.";

  return errors;
}

type WasteSubmitDeps = {
  form: WasteFormValues;
  items: InventoryItem[];
  setErrors: (errors: FormErrors<WasteFormValues>) => void;
  showValidationToast: () => void;
  resetForm: () => void;
  mutateWaste: (payload: CreateWasteData) => Promise<unknown>;
};

export async function submitWasteForm({
  form,
  items,
  setErrors,
  showValidationToast,
  resetForm,
  mutateWaste,
}: WasteSubmitDeps): Promise<"validation_error" | "success"> {
  const validationErrors = validateWasteForm(form);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    showValidationToast();
    return "validation_error";
  }

  const quantityValue = Number(form.quantity);
  const selectedItem = items.find((item) => item.id === form.item_id);
  const costImpact =
    selectedItem?.cost_per_unit && Number.isFinite(quantityValue)
      ? quantityValue * selectedItem.cost_per_unit
      : undefined;

  await mutateWaste({
    item_id: form.item_id,
    location_id: form.location_id || undefined,
    quantity: quantityValue,
    unit_id: selectedItem?.unit_id,
    waste_type: form.waste_type as WasteTypeValue,
    reason: form.reason || undefined,
    cost_impact: costImpact,
  });

  resetForm();
  return "success";
}

type AdjustmentSubmitDeps = {
  form: AdjustmentFormValues;
  setErrors: (errors: FormErrors<AdjustmentFormValues>) => void;
  showValidationToast: () => void;
};

export function processAdjustmentForm({
  form,
  setErrors,
  showValidationToast,
}: AdjustmentSubmitDeps): "validation_error" | "success" {
  const validationErrors = validateAdjustmentForm(form);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    showValidationToast();
    return "validation_error";
  }

  return "success";
}
