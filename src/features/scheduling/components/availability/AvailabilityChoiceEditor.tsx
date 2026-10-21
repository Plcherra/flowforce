import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

type AvailabilityChoice = "open" | "fixed";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function weekdayValue(value: number | null | undefined) {
  if (value == null || value < 0 || value > 6) return "";
  return String(value);
}

function parseWeekday(value: string) {
  if (value === "") return null;
  const parsed = Number(value);
  return parsed >= 0 && parsed <= 6 ? parsed : null;
}

interface AvailabilityChoiceEditorProps {
  orgId: string;
}

export function AvailabilityChoiceEditor({
  orgId,
}: AvailabilityChoiceEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<"" | AvailabilityChoice>("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [postingWeekday, setPostingWeekday] = useState("");

  const prefsQuery = useQuery({
    queryKey: ["org-prefs-availability-choice", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_prefs")
        .select(
          "id, availability_choice, schedule_window_start_weekday, schedule_window_end_weekday, schedule_posting_weekday",
        )
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (!prefsQuery.isSuccess) return;
    const stored = prefsQuery.data?.availability_choice;
    setChoice(stored === "open" || stored === "fixed" ? stored : "");
    setWindowStart(weekdayValue(prefsQuery.data?.schedule_window_start_weekday));
    setWindowEnd(weekdayValue(prefsQuery.data?.schedule_window_end_weekday));
    setPostingWeekday(weekdayValue(prefsQuery.data?.schedule_posting_weekday));
  }, [prefsQuery.data, prefsQuery.isSuccess]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (choice !== "open" && choice !== "fixed") {
        throw new Error("Choose open or fixed.");
      }
      const { error } = await supabase.from("org_prefs").upsert(
        {
          id: orgId,
          availability_choice: choice,
          schedule_window_start_weekday: parseWeekday(windowStart),
          schedule_window_end_weekday: parseWeekday(windowEnd),
          schedule_posting_weekday: parseWeekday(postingWeekday),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: "Availability choice saved",
        description: "Open or fixed, and the schedule window weekdays, are saved.",
      });
      await queryClient.invalidateQueries({
        queryKey: ["org-prefs-availability-choice", orgId],
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to save availability choice",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  return (
    <section
      data-testid="availability-choice-editor"
      className="space-y-4 rounded-lg border bg-background p-4"
    >
      <div>
        <h3 className="text-lg font-semibold">Availability choice</h3>
        <p className="text-sm text-muted-foreground">
          Open is any day and any time. Fixed uses the weekday rows. The three
          weekdays set the schedule window and the posting day.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="availability-choice">Choice</Label>
          <select
            id="availability-choice"
            data-testid="availability-choice"
            aria-label="Availability choice"
            className={selectClassName}
            value={choice}
            disabled={prefsQuery.isLoading || saveMutation.isPending}
            onChange={(event) =>
              setChoice(event.target.value as "" | AvailabilityChoice)
            }
          >
            <option value="">Select</option>
            <option value="open">Open</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
        <WeekdaySelect
          id="schedule-window-start"
          label="Window start"
          value={windowStart}
          disabled={prefsQuery.isLoading || saveMutation.isPending}
          onChange={setWindowStart}
        />
        <WeekdaySelect
          id="schedule-window-end"
          label="Window end"
          value={windowEnd}
          disabled={prefsQuery.isLoading || saveMutation.isPending}
          onChange={setWindowEnd}
        />
        <WeekdaySelect
          id="schedule-posting-weekday"
          label="Posting weekday"
          value={postingWeekday}
          disabled={prefsQuery.isLoading || saveMutation.isPending}
          onChange={setPostingWeekday}
        />
      </div>
      <Button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || prefsQuery.isLoading}
      >
        Save availability choice
      </Button>
    </section>
  );
}

function WeekdaySelect({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        data-testid={id}
        aria-label={label}
        className={selectClassName}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Not set</option>
        {WEEKDAYS.map((day) => (
          <option key={day.value} value={day.value}>
            {day.label}
          </option>
        ))}
      </select>
    </div>
  );
}
