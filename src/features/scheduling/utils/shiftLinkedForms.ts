import {
  CHECKLIST_SLOTS,
  type ChecklistArea,
  type ChecklistSlot,
} from "@/features/forms/utils/checklistForms";
import { listsForShift } from "@/features/forms/utils/shiftChecklistLists";
import { checklistAreaFromShift } from "@/features/tasks/utils/myShiftView";

export type ShiftLinkedForm = {
  slot: ChecklistSlot;
  formId: string;
  title: string;
  href: string;
};

export function formsLinkedToShift(input: {
  role?: string | null;
  title?: string | null;
  forms: readonly { id: string; title?: string | null; settings?: unknown }[];
}): { area: ChecklistArea | null; forms: ShiftLinkedForm[] } {
  const area = checklistAreaFromShift({ role: input.role, title: input.title });
  if (!area) return { area: null, forms: [] };
  const lists = listsForShift(input.forms, area);
  return {
    area,
    forms: CHECKLIST_SLOTS.flatMap((slot) => {
      const form = lists[slot];
      if (!form?.id) return [];
      return [
        {
          slot,
          formId: form.id,
          title: form.title?.trim() || form.id,
          href: `/app/forms?form=${form.id}`,
        },
      ];
    }),
  };
}
