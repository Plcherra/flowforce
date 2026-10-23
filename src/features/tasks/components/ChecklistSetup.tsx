import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { updateFormRow } from "@/features/forms/repositories/formsRepository";
import type { Json } from "@/integrations/supabase/types";
import {
  readChecklistAddress,
  type ChecklistArea,
  type ChecklistSlot,
} from "@/features/forms/utils/checklistForms";
import { assignChecklistAddress } from "@/features/forms/utils/assignChecklistForm";
import {
  ChecklistSetupForm,
  checklistSlotKey,
  type ChecklistSlotKey,
} from "./ChecklistSetupForm";

type SetupForm = { id: string; title: string | null; settings?: unknown };

function selectionFromForms(forms: readonly SetupForm[]): Partial<Record<ChecklistSlotKey, string>> {
  const selected: Partial<Record<ChecklistSlotKey, string>> = {};
  for (const form of forms) {
    const address = readChecklistAddress(form.settings);
    if (!address) continue;
    selected[checklistSlotKey(address.area, address.slot)] = form.id;
  }
  return selected;
}

export function ChecklistSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [forms, setForms] = useState<SetupForm[]>([]);
  const [selected, setSelected] = useState<Partial<Record<ChecklistSlotKey, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void supabase
      .from("forms")
      .select("id, title, settings")
      .eq("company_id", companyId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoading(false);
          return;
        }
        const rows = (data ?? []) as SetupForm[];
        setForms(rows);
        setSelected(selectionFromForms(rows));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const save = async (area: ChecklistArea, slot: ChecklistSlot) => {
    if (!companyId) return;
    const key = checklistSlotKey(area, slot);
    const formId = selected[key] || null;
    const changes = assignChecklistAddress(forms, formId, { area, slot });
    try {
      let next = forms;
      for (const change of changes) {
        await updateFormRow(companyId, change.id, {
          settings: change.settings as Json,
        });
        next = next.map((form) =>
          form.id === change.id ? { ...form, settings: change.settings } : form,
        );
      }
      setForms(next);
      setSelected(selectionFromForms(next));
      toast({ title: t("tasks.listSaved") });
    } catch {
      toast({ title: t("tasks.unableToSaveList"), variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("tasks.loadingShift")}</p>;
  }

  return (
    <ChecklistSetupForm
      forms={forms}
      selected={selected}
      onSelect={(key, formId) =>
        setSelected((current) => ({
          ...current,
          [key]: formId === "none" ? "" : formId,
        }))
      }
      onSave={(area, slot) => {
        void save(area, slot);
      }}
    />
  );
}
