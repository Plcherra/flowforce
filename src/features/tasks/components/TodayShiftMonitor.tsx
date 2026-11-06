import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import {
  todayShiftProgress,
  type TodayShiftRow,
} from "@/features/tasks/utils/todayShiftMonitor";
import type {
  MyShiftField,
  MyShiftForm,
  MyShiftSchedule,
  MyShiftSubmission,
} from "@/features/tasks/utils/myShiftView";
import type { CompanyRoleRef } from "@/features/tasks/utils/roleShiftLists";

export function TodayShiftMonitor() {
  const { t } = useTranslation();
  const { profile, loading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [rows, setRows] = useState<TodayShiftRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!companyId) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 2);
    void (async () => {
      const [schedulesResult, formsResult, peopleResult, rolesResult] = await Promise.all([
        supabase
          .from("schedules")
          .select("id, role, title, start_time, end_time, user_id, is_published, is_template")
          .eq("company_id", companyId)
          .gte("start_time", start.toISOString())
          .lt("start_time", end.toISOString()),
        supabase // pragma: allowlist secret
          .from("forms")
          .select("id, title, settings, status")
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("company_id", companyId),
        supabase // pragma: allowlist secret
          .from("company_roles")
          .select("id, name")
          .eq("company_id", companyId),
      ]);
      if (cancelled) return;
      if (
        schedulesResult.error ||
        formsResult.error ||
        peopleResult.error ||
        rolesResult.error
      ) {
        setFailed(true);
        return;
      }
      const forms = (formsResult.data ?? []) as MyShiftForm[];
      const formIds = forms.map((form) => form.id);
      let fields: MyShiftField[] = [];
      let submissions: MyShiftSubmission[] = [];
      if (formIds.length > 0) {
        const [fieldsResult, submissionsResult] = await Promise.all([
          supabase
            .from("form_fields")
            .select("id, form_id, label, field_order")
            .in("form_id", formIds),
          supabase
            .from("form_submissions")
            .select("form_id, submitted_at, submitted_by, submission_data")
            .in("form_id", formIds)
            .order("submitted_at", { ascending: false })
            .limit(200),
        ]);
        if (cancelled) return;
        if (fieldsResult.error || submissionsResult.error) {
          setFailed(true);
          return;
        }
        fields = (fieldsResult.data ?? []) as MyShiftField[];
        submissions = (submissionsResult.data ?? []) as MyShiftSubmission[];
      }
      const people: Record<string, string> = {};
      for (const person of peopleResult.data ?? []) {
        people[person.id] = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
      }
      setNames(people);
      setRows(
        todayShiftProgress({
          now,
          schedules: (schedulesResult.data ?? []) as MyShiftSchedule[],
          forms,
          fields,
          submissions,
          roles: (rolesResult.data ?? []) as CompanyRoleRef[],
        }),
      );
      setFailed(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, loading]);

  if (failed) {
    return <p className="text-sm text-destructive">{t("tasks.unableToLoadShift")}</p>;
  }
  if (!rows) {
    return <p className="text-sm text-muted-foreground">{t("tasks.loadingShift")}</p>;
  }
  if (rows.length === 0) {
    return (
      <section className="space-y-2" data-testid="today-shift-monitor">
        <h2 className="text-lg font-semibold">{t("tasks.todayLists")}</h2>
        <p className="text-sm text-muted-foreground">{t("tasks.noShiftToday")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3" data-testid="today-shift-monitor">
      <h2 className="text-lg font-semibold">{t("tasks.todayLists")}</h2>
      {rows.map((row) => (
        <article key={row.shiftId} className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
          <div>
            <p className="font-medium">
              {row.personId ? names[row.personId] || t("tasks.unassigned") : t("tasks.unassigned")}
            </p>
            <p className="text-sm text-muted-foreground">{row.shiftTitle}</p>
          </div>
          {row.lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("tasks.shiftHasNoLists")}</p>
          ) : (
            <ul className="space-y-1">
              {row.lists.map((list) => (
                <li key={list.formId} className="text-sm" data-testid={`today-shift-list-${list.formId}`}>
                  <span className="font-medium">
                    {t("tasks.listProgress", {
                      done: list.done,
                      total: list.total,
                    })}
                  </span>
                  <span>{list.title}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </section>
  );
}
