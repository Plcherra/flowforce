import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHECKLIST_AREAS,
  CHECKLIST_SLOTS,
  type ChecklistArea,
  type ChecklistSlot,
} from "@/features/forms/utils/checklistForms";

const AREA_KEYS: Record<ChecklistArea, string> = {
  cashier: "tasks.areaCashier",
  supervisor: "tasks.areaSupervisor",
};

const SLOT_KEYS: Record<ChecklistSlot, string> = {
  opening: "tasks.openingList",
  daily: "tasks.daily",
  closing: "tasks.closingList",
};

export type ChecklistSlotKey = `${ChecklistArea}:${ChecklistSlot}`;

export function checklistSlotKey(area: ChecklistArea, slot: ChecklistSlot): ChecklistSlotKey {
  return `${area}:${slot}`;
}

interface ChecklistSetupFormProps {
  forms: readonly { id: string; title?: string | null }[];
  selected: Partial<Record<ChecklistSlotKey, string>>;
  onSelect: (key: ChecklistSlotKey, formId: string) => void;
  onSave: (area: ChecklistArea, slot: ChecklistSlot) => void;
}

export function ChecklistSetupForm({
  forms,
  selected,
  onSelect,
  onSave,
}: ChecklistSetupFormProps) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="checklist-setup">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("tasks.attachLists")}</h2>
        <p className="text-sm text-muted-foreground">{t("tasks.attachListsHelp")}</p>
      </div>
      {CHECKLIST_AREAS.flatMap((area) =>
        CHECKLIST_SLOTS.map((slot) => {
          const key = checklistSlotKey(area, slot);
          const value = selected[key] || "none";
          return (
            <div
              key={key}
              className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
              data-testid={`checklist-slot-${area}-${slot}`}
            >
              <p className="text-sm font-medium">
                {t(AREA_KEYS[area])} · {t(SLOT_KEYS[slot])}
              </p>
              <Select value={value} onValueChange={(next) => onSelect(key, next)}>
                <SelectTrigger className="min-h-11" aria-label={t("tasks.chooseForm")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("tasks.noForm")}</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title?.trim() || form.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => onSave(area, slot)}
              >
                {t("tasks.saveList")}
              </Button>
            </div>
          );
        }),
      )}
    </section>
  );
}
