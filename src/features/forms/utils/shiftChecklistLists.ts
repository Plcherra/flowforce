import {
  CHECKLIST_SLOTS,
  findChecklistForm,
  type ChecklistArea,
  type ChecklistSlot,
} from "./checklistForms";

export type ShiftChecklistLists<T> = Record<ChecklistSlot, T | null>;

export function listsForShift<T extends { settings?: unknown }>(
  forms: readonly T[],
  role: ChecklistArea,
): ShiftChecklistLists<T> {
  const lists = {} as ShiftChecklistLists<T>;
  for (const slot of CHECKLIST_SLOTS) {
    lists[slot] = findChecklistForm(forms, role, slot);
  }
  return lists;
}
