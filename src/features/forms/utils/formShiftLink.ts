import {
  readChecklistAddress,
  type ChecklistArea,
  type ChecklistSlot,
} from "./checklistForms";

const AREA_KEYS: Record<ChecklistArea, string> = {
  cashier: "tasks.areaCashier",
  supervisor: "tasks.areaSupervisor",
};

const SLOT_KEYS: Record<ChecklistSlot, string> = {
  opening: "tasks.openingList",
  daily: "tasks.daily",
  closing: "tasks.closingList",
};

export function formShiftLinkKeys(
  settings: unknown,
): { areaKey: string; slotKey: string } | null {
  const address = readChecklistAddress(settings);
  if (!address) return null;
  return { areaKey: AREA_KEYS[address.area], slotKey: SLOT_KEYS[address.slot] };
}
