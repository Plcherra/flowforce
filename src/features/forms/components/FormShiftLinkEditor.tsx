import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { updateFormRow } from "@/features/forms/repositories/formsRepository";
import type { Json } from "@/integrations/supabase/types";
import {
  CHECKLIST_AREAS,
  CHECKLIST_SLOTS,
  readChecklistAddress,
  type ChecklistArea,
  type ChecklistSlot,
} from "@/features/forms/utils/checklistForms";
import {
  assignChecklistAddress,
  withoutChecklistAddress,
} from "@/features/forms/utils/assignChecklistForm";
import { formShiftLinkKeys } from "@/features/forms/utils/formShiftLink";

type LinkForm = { id: string; title: string | null; settings?: unknown };

const NONE = "none";

export function FormShiftLinkEditor({ formId }: { formId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [forms, setForms] = useState<LinkForm[]>([]);
  const [area, setArea] = useState<string>(NONE);
  const [slot, setSlot] = useState<ChecklistSlot>("opening");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void supabase
      .from("forms")
      .select("id, title, settings")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as LinkForm[];
        setForms(rows);
        const current = readChecklistAddress(rows.find((row) => row.id === formId)?.settings);
        setArea(current?.area ?? NONE);
        setSlot(current?.slot ?? "opening");
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, formId]);

  const current = forms.find((row) => row.id === formId);
  const link = formShiftLinkKeys(current?.settings);

  const persist = async (next: LinkForm[]) => {
    setForms(next);
    const saved = readChecklistAddress(next.find((row) => row.id === formId)?.settings);
    setArea(saved?.area ?? NONE);
    setSlot(saved?.slot ?? "opening");
  };

  const save = async () => {
    if (!companyId || area === NONE) return;
    setSaving(true);
    try {
      const changes = assignChecklistAddress(forms, formId, {
        area: area as ChecklistArea,
        slot,
      });
      let next = forms;
      for (const change of changes) {
        await updateFormRow(companyId, change.id, { settings: change.settings as Json });
        next = next.map((row) =>
          row.id === change.id ? { ...row, settings: change.settings } : row,
        );
      }
      if (!next.some((row) => row.id === formId)) {
        const created = changes.find((change) => change.id === formId);
        if (created) next = [...next, { id: formId, title: null, settings: created.settings }];
      }
      await persist(next);
      toast({ title: t("forms.shiftLinkSaved") });
    } catch {
      toast({ title: t("forms.unableToSaveShiftLink"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!companyId || !current) return;
    setSaving(true);
    try {
      const settings = withoutChecklistAddress(current.settings);
      await updateFormRow(companyId, formId, { settings: settings as Json });
      await persist(forms.map((row) => (row.id === formId ? { ...row, settings } : row)));
      toast({ title: t("forms.shiftLinkSaved") });
    } catch {
      toast({ title: t("forms.unableToSaveShiftLink"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-2 pt-3" data-testid="form-shift-link">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{t("forms.shiftLink")}</h2>
        <p className="text-sm text-muted-foreground">{t("forms.shiftLinkHelp")}</p>
      </div>
      <p className="text-sm" data-testid="form-shift-link-current">
        {link
          ? t("forms.linkedAs", { area: t(link.areaKey), slot: t(link.slotKey) })
          : t("forms.notLinked")}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="min-h-11" aria-label={t("forms.shiftLink")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("forms.notLinked")}</SelectItem>
            {CHECKLIST_AREAS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(value === "cashier" ? "tasks.areaCashier" : "tasks.areaSupervisor")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {area !== NONE ? (
          <Select value={slot} onValueChange={(value) => setSlot(value as ChecklistSlot)}>
            <SelectTrigger className="min-h-11" aria-label={t("tasks.chooseForm")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKLIST_SLOTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(
                    value === "opening"
                      ? "tasks.openingList"
                      : value === "daily"
                        ? "tasks.daily"
                        : "tasks.closingList",
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="min-h-11" disabled={saving || area === NONE} onClick={() => void save()}>
          {t("forms.saveShiftLink")}
        </Button>
        {link ? (
          <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => void remove()}>
            {t("forms.removeShiftLink")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
