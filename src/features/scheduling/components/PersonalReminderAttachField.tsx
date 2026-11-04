import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { LinkedRecordKind } from "@/features/scheduling/utils/linkedScheduleReminder";

const NONE = "none";

interface PersonalReminderAttachFieldProps {
  companyId: string | null;
  kind: LinkedRecordKind | "";
  recordId: string;
  onKindChange: (kind: LinkedRecordKind | "") => void;
  onRecordChange: (recordId: string) => void;
}

interface NamedRecord {
  id: string;
  title: string | null;
}

function recordLabel(row: NamedRecord, fallback: string) {
  const title = row.title?.trim();
  return title || fallback;
}

export function PersonalReminderAttachField({
  companyId,
  kind,
  recordId,
  onKindChange,
  onRecordChange,
}: PersonalReminderAttachFieldProps) {
  const { t } = useTranslation();
  const recordsQuery = useQuery({
    queryKey: ["personal-reminder-records", companyId, kind],
    enabled: Boolean(companyId) && kind !== "",
    queryFn: async () => {
      if (kind === "task") {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title")
          .eq("company_id", companyId!)
          .order("title", { ascending: true })
          .limit(40);
        if (error) throw error;
        return (data ?? []) as NamedRecord[];
      }
      if (kind === "form") {
        const { data, error } = await supabase
          .from("forms")
          .select("id, title, status")
          .eq("company_id", companyId!)
          .order("title", { ascending: true })
          .limit(40);
        if (error) throw error;
        return ((data ?? []) as Array<NamedRecord & { status?: string | null }>).filter(
          (row) => row.status !== "archived",
        );
      }
      const { data, error } = await supabase
        .from("schedules")
        .select("id, title")
        .eq("company_id", companyId!)
        .order("start_time", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as NamedRecord[];
    },
  });

  const records = recordsQuery.data ?? [];
  const kindLabel =
    kind === "task"
      ? t("schedule.kindTask")
      : kind === "form"
        ? t("schedule.kindForm")
        : t("schedule.kindShift");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>{t("schedule.opens")}</Label>
        <Select
          value={kind || NONE}
          onValueChange={(value) => {
            onKindChange(value === NONE ? "" : (value as LinkedRecordKind));
            onRecordChange("");
          }}
        >
          <SelectTrigger aria-label={t("schedule.reminderOpens")} data-testid="personal-reminder-opens">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("schedule.justThisReminder")}</SelectItem>
            <SelectItem value="task">{t("schedule.aTask")}</SelectItem>
            <SelectItem value="form">{t("schedule.aForm")}</SelectItem>
            <SelectItem value="shift">{t("schedule.aShift")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {kind ? (
        <div className="space-y-1">
          <Label>{t("schedule.whichRecord", { kind: kindLabel })}</Label>
          <Select value={recordId || undefined} onValueChange={onRecordChange}>
            <SelectTrigger
              aria-label={t("schedule.reminderForKind", { kind: kindLabel })}
              data-testid="personal-reminder-record"
            >
              <SelectValue
                placeholder={
                  recordsQuery.isLoading
                    ? t("schedule.loading")
                    : t("schedule.chooseAKind", { kind: kindLabel })
                }
              />
            </SelectTrigger>
            <SelectContent>
              {records.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {recordLabel(row, t("schedule.untitledKind", { kind: kindLabel }))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!recordsQuery.isLoading && records.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("schedule.noKindYet", { kind: kindLabel })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
