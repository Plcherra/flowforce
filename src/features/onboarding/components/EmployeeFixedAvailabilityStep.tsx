import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfIsoWeek } from "@/features/availability/utils/lockEngine";
import {
  FULL_DAY_HOURS,
  clockRangeFromHours,
  hoursFromClockRange,
  isFullDayHours,
} from "@/features/availability/utils/availabilityUtils";
import type { AvailabilityGrid } from "@/features/availability/components/AvailabilityRequestForm";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface EmployeeFixedAvailabilityStepProps {
  employeeId: string;
  companyId: string;
  onSent: () => void;
}

export function EmployeeFixedAvailabilityStep({
  employeeId,
  companyId,
  onSent,
}: EmployeeFixedAvailabilityStepProps) {
  const { toast } = useToast();
  const [grid, setGrid] = useState<AvailabilityGrid>({});

  const send = useMutation({
    mutationFn: async () => {
      const weekStart = startOfIsoWeek(new Date()).toISOString().slice(0, 10);
      const { error } = await supabase.from("availability_request").insert({
        employee_id: employeeId,
        company_id: companyId,
        week_start: weekStart,
        status: "pending",
        payload: {
          source: "employee-onboarding",
          desiredAvailability: grid,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Fixed availability sent",
        description: "Your manager can review this availability request.",
      });
      onSent();
    },
    onError: (error) => {
      toast({
        title: "Unable to send fixed availability",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const setDayHours = (dayIndex: number, hours: number[]) => {
    setGrid((prev) => ({ ...prev, [dayIndex]: hours }));
  };

  return (
    <section
      data-testid="employee-fixed-availability-onboarding"
      className="mb-4 rounded-lg border bg-background p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Send your fixed availability</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is part of employee onboarding. Your company uses fixed
        availability, so your first login sends the hours you can work.
      </p>
      <div className="mt-4 space-y-2" data-testid="employee-fixed-availability-days">
        {DAY_LABELS.map((label, dayIndex) => {
          const hours = grid[dayIndex] ?? [];
          const allDay = isFullDayHours(hours);
          const range =
            allDay || hours.length === 0
              ? { fromTime: "09:00", toTime: "17:00" }
              : clockRangeFromHours(hours);
          return (
            <div
              key={label}
              data-testid={`employee-fixed-day-${label.toLowerCase()}`}
              className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center"
            >
              <span className="w-12 text-sm font-medium">{label}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={allDay ? "default" : "outline"}
                  aria-pressed={allDay}
                  onClick={() => setDayHours(dayIndex, [...FULL_DAY_HOURS])}
                >
                  All day on
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!allDay ? "default" : "outline"}
                  aria-pressed={!allDay}
                  onClick={() =>
                    setDayHours(
                      dayIndex,
                      hoursFromClockRange(range.fromTime, range.toTime),
                    )
                  }
                >
                  Off
                </Button>
              </div>
              {allDay ? null : (
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    aria-label={`${label} from`}
                    type="time"
                    className="h-8 w-32"
                    value={range.fromTime}
                    onChange={(event) =>
                      setDayHours(
                        dayIndex,
                        hoursFromClockRange(event.target.value, range.toTime),
                      )
                    }
                  />
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    aria-label={`${label} to`}
                    type="time"
                    className="h-8 w-32"
                    value={range.toTime}
                    onChange={(event) =>
                      setDayHours(
                        dayIndex,
                        hoursFromClockRange(range.fromTime, event.target.value),
                      )
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        className="mt-4"
        onClick={() => send.mutate()}
        disabled={send.isPending}
      >
        Send fixed availability
      </Button>
    </section>
  );
}
