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
  const kindLabel = kind === "task" ? "task" : kind === "form" ? "form" : "shift";

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>Opens</Label>
        <Select
          value={kind || NONE}
          onValueChange={(value) => {
            onKindChange(value === NONE ? "" : (value as LinkedRecordKind));
            onRecordChange("");
          }}
        >
          <SelectTrigger aria-label="Reminder opens" data-testid="personal-reminder-opens">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Just this reminder</SelectItem>
            <SelectItem value="task">A task</SelectItem>
            <SelectItem value="form">A form</SelectItem>
            <SelectItem value="shift">A shift</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {kind ? (
        <div className="space-y-1">
          <Label>Which {kindLabel}</Label>
          <Select value={recordId || undefined} onValueChange={onRecordChange}>
            <SelectTrigger
              aria-label={`Reminder ${kindLabel}`}
              data-testid="personal-reminder-record"
            >
              <SelectValue placeholder={recordsQuery.isLoading ? "Loading..." : `Choose a ${kindLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {records.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {recordLabel(row, `Untitled ${kindLabel}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!recordsQuery.isLoading && records.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No {kindLabel} you can open yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
