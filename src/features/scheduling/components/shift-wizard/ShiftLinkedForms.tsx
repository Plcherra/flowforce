import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { ChecklistSlot } from "@/features/forms/utils/checklistForms";
import { formsLinkedToShift, type ShiftLinkedForm } from "@/features/scheduling/utils/shiftLinkedForms";

const SLOT_KEYS: Record<ChecklistSlot, string> = {
  opening: "tasks.openingList",
  daily: "tasks.daily",
  closing: "tasks.closingList",
};

export function ShiftLinkedForms({
  role,
  title,
}: {
  role?: string | null;
  title?: string | null;
}) {
  const { t } = useTranslation();
  const { profile, loading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [forms, setForms] = useState<ShiftLinkedForm[] | null>(null);
  const [unmapped, setUnmapped] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!companyId) {
      setForms([]);
      setUnmapped(true);
      return;
    }
    let cancelled = false;
    void supabase
      .from("forms")
      .select("id, title, settings")
      .eq("company_id", companyId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setForms([]);
          return;
        }
        const linked = formsLinkedToShift({ role, title, forms: data ?? [] });
        setUnmapped(linked.area === null);
        setForms(linked.forms);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, loading, role, title]);

  return (
    <section className="space-y-3" data-testid="shift-linked-forms">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t("schedule.listsOnThisShift")}</h2>
        <p className="text-sm text-muted-foreground">{t("schedule.listsOnThisShiftHelp")}</p>
      </div>
      {forms === null ? (
        <p className="text-sm text-muted-foreground">{t("tasks.loadingShift")}</p>
      ) : unmapped ? (
        <p className="text-sm text-muted-foreground">{t("tasks.shiftHasNoLists")}</p>
      ) : forms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noListAttached")}</p>
      ) : (
        <ul className="space-y-2">
          {forms.map((form) => (
            <li key={form.formId}>
              <Link
                to={form.href}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border/70 bg-background px-3 text-sm"
              >
                <span>
                  {t(SLOT_KEYS[form.slot])} · {form.title}
                </span>
                <span className="text-muted-foreground">{t("schedule.openLinkedForm")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
