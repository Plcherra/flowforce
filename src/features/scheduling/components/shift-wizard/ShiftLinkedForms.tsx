import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { formatDateTime } from "@/features/forms/components/form-utils";
import {
  formsLinkedToShift,
  type ShiftLinkedForm,
} from "@/features/scheduling/utils/shiftLinkedForms";
import type { CompanyRoleRef } from "@/features/tasks/utils/roleShiftLists";

export function ShiftLinkedForms({
  role,
}: {
  role?: string | null;
  title?: string | null;
}) {
  const { t } = useTranslation();
  const { profile, loading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [forms, setForms] = useState<ShiftLinkedForm[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!companyId) {
      setForms([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      supabase // pragma: allowlist secret
        .from("forms")
        .select("id, title, settings, status")
        .eq("company_id", companyId),
      supabase // pragma: allowlist secret
        .from("company_roles")
        .select("id, name")
        .eq("company_id", companyId),
    ]).then(([formsResult, rolesResult]) => {
      if (cancelled) return;
      if (formsResult.error || rolesResult.error) {
        setForms([]);
        return;
      }
      setForms(
        formsLinkedToShift({
          role,
          forms: formsResult.data ?? [],
          roles: (rolesResult.data ?? []) as CompanyRoleRef[],
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, loading, role]);

  return (
    <section className="space-y-3" data-testid="shift-linked-forms">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t("schedule.listsOnThisShift")}</h2>
        <p className="text-sm text-muted-foreground">{t("schedule.listsOnThisShiftHelp")}</p>
      </div>
      {forms === null ? (
        <p className="text-sm text-muted-foreground">{t("tasks.loadingShift")}</p>
      ) : forms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.shiftHasNoLists")}</p>
      ) : (
        <ul className="space-y-2">
          {forms.map((form) => {
            const due = formatDateTime(form.dueAt);
            const from = formatDateTime(form.showFrom);
            return (
              <li key={form.formId}>
                <Link
                  to={form.href}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border/70 bg-background px-3 text-sm"
                  data-testid={`shift-linked-form-${form.formId}`}
                >
                <span className="flex min-w-0 flex-col">
                  <span>{form.title}</span>
                  {from ? <span>{t("tasks.showFromAt", { time: from })}</span> : null}
                  {due ? <span>{t("tasks.listDueAt", { time: due })}</span> : null}
                </span>
                  <span className="text-muted-foreground">{t("schedule.openLinkedForm")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
