import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createFormScheduleReminder } from "@/features/scheduling/repositories/scheduleRemindersRepository";
import {
  REMINDER_REPEAT_OPTIONS,
  type ReminderRepeat,
} from "@/features/scheduling/utils/reminderRepeat";

interface AssignFormReminderFormProps {
  companyId: string;
  people: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
  profileId: string | null;
}

function personName(person?: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
  return name || "Team member";
}

export function AssignFormReminderForm({
  companyId,
  people,
  profileId,
}: AssignFormReminderFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formId, setFormId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState<ReminderRepeat>("weekly");
  const [saving, setSaving] = useState(false);

  const formsQuery = useQuery({
    queryKey: ["schedule-reminder-forms", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, title")
        .eq("company_id", companyId)
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string | null }>;
    },
  });

  const others = people.filter((person) => person.id !== profileId);
  const selectedForm = (formsQuery.data ?? []).find((form) => form.id === formId);

  const assign = async () => {
    if (!formId || !targetId || !selectedForm) return;
    setSaving(true);
    try {
      await createFormScheduleReminder({
        userId: targetId,
        formId,
        title: selectedForm.title?.trim() || "Form reminder",
        time,
        repeat,
      });
      setFormId("");
      setTargetId("");
      await queryClient.invalidateQueries({
        queryKey: ["schedule-assignment-reminders", companyId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["linked-schedule-reminders"],
      });
      toast({
        title: "Form reminder assigned",
        description: "That person can see the time and how often it repeats.",
      });
    } catch {
      toast({
        title: "Could not assign the form reminder",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-2 border-t pt-3" data-testid="assign-form-reminder">
      <div className="space-y-1">
        <Label>{t("schedule.form")}</Label>
        <Select value={formId} onValueChange={setFormId}>
          <SelectTrigger aria-label={t("schedule.formReminder")}>
            <SelectValue placeholder={t("schedule.chooseAForm")} />
          </SelectTrigger>
          <SelectContent>
            {(formsQuery.data ?? []).map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.title?.trim() || "Untitled form"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>{t("schedule.who")}</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger aria-label={t("schedule.formReminderRecipient")}>
              <SelectValue placeholder={t("schedule.chooseAPerson")} />
            </SelectTrigger>
            <SelectContent>
              {others.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {personName(person)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="form-reminder-time">{t("schedule.time")}</Label>
          <Input
            id="form-reminder-time"
            aria-label={t("schedule.formReminderTime")}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("schedule.howOften")}</Label>
          <Select
            value={repeat}
            onValueChange={(value) => setRepeat(value as ReminderRepeat)}
          >
            <SelectTrigger aria-label={t("schedule.howOften")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_REPEAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="w-fit"
        onClick={assign}
        disabled={saving || !formId || !targetId || !time}
      >
        {saving ? "Assigning..." : "Assign form reminder"}
      </Button>
    </div>
  );
}
