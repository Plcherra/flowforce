import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarCheck, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-states";
import {
  AvailabilityRequestForm,
  type AvailabilityGrid,
} from "@/features/availability/components/AvailabilityRequestForm";
import { DEFAULT_ORG_ID, startOfIsoWeek } from "@/features/availability/utils/lockEngine";
import {
  cloneGrid,
  gridFromAvailabilityRows,
  availabilityTimestamp,
  rangesFromGrid,
  type StaffAvailabilityRow,
} from "@/features/availability/utils/availabilityUtils";
import {
  parseRepeatPattern,
  type RepeatPattern,
} from "@/features/scheduling/utils/repeatPattern";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useScheduling } from "@/contexts/SchedulingContext";
import { cn } from "@/lib/utils";

interface PersonalAvailabilityPanelProps {
  className?: string;
}

const hasId = (value: unknown): value is { id: string } =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof (value as { id: unknown }).id === "string";

export function PersonalAvailabilityPanel({
  className,
}: PersonalAvailabilityPanelProps) {
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile();
  const {
    loading: schedulingLoading,
    refetchAll,
    isFallbackData,
  } = useScheduling();
  const queryClient = useQueryClient();

  const fallbackProfileId = hasId(profile) ? profile.id : null;
  const employeeId = profile?.userId ?? fallbackProfileId;
  const orgId = profile?.companyId ?? profile?.company_id ?? DEFAULT_ORG_ID;

  const weekStart = useMemo(() => {
    const isoStart = startOfIsoWeek(new Date());
    return isoStart.toISOString().slice(0, 10);
  }, []);

  const availabilityQuery = useQuery({
    queryKey: ["availability-grid", employeeId, weekStart],
    enabled: !isFallbackData && Boolean(employeeId) && !profileLoading,
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("staff_availability")
        .select(
          "id, user_id, day_of_week, start_time, end_time, week_start_date, recurrence",
        )
        .eq("user_id", employeeId)
        .eq("week_start_date", weekStart);
      if (error) throw error;
      return (data ?? []) as StaffAvailabilityRow[];
    },
  });

  const initialGrid = useMemo<AvailabilityGrid>(() => {
    if (!availabilityQuery.data) return {};
    return cloneGrid(gridFromAvailabilityRows(availabilityQuery.data));
  }, [availabilityQuery.data]);

  const initialRepeats = useMemo<Record<number, RepeatPattern | null>>(() => {
    const repeats: Record<number, RepeatPattern | null> = {};
    for (const row of availabilityQuery.data ?? []) {
      if (row.day_of_week == null) continue;
      const pattern = parseRepeatPattern(row.recurrence);
      if (pattern) repeats[row.day_of_week] = pattern;
    }
    return repeats;
  }, [availabilityQuery.data]);

  const handleDirectSave = useCallback(
    async (
      nextGrid: AvailabilityGrid,
      repeats?: Record<number, RepeatPattern | null>,
    ) => {
      if (!employeeId) {
        throw new Error("We need your profile details to save availability.");
      }
      const ranges = rangesFromGrid(nextGrid);

      const deleteResult = await supabase
        .from("staff_availability")
        .delete()
        .eq("user_id", employeeId)
        .eq("week_start_date", weekStart);
      if (deleteResult.error) {
        throw new Error(
          deleteResult.error.message ||
            "Unable to update your availability right now.",
        );
      }

      const daysWithHours = new Set(ranges.map((range) => range.dayOfWeek));
      const insertRows = ranges.map((range) => ({
        user_id: employeeId,
        day_of_week: range.dayOfWeek,
        start_time: availabilityTimestamp(
          weekStart,
          range.dayOfWeek,
          range.startTime,
        ),
        end_time: availabilityTimestamp(
          weekStart,
          range.dayOfWeek,
          range.endTime,
        ),
        week_start_date: weekStart,
        is_preferred: true,
        recurrence: repeats?.[range.dayOfWeek] ?? null,
      }));
      for (let day = 0; day < 7; day += 1) {
        const pattern = repeats?.[day];
        if (!pattern || daysWithHours.has(day)) continue;
        insertRows.push({
          user_id: employeeId,
          day_of_week: day,
          start_time: null,
          end_time: null,
          week_start_date: weekStart,
          is_preferred: false,
          recurrence: pattern,
        });
      }
      if (insertRows.length > 0) {
        const insertResult = await supabase
          .from("staff_availability")
          .insert(insertRows);
        if (insertResult.error) {
          throw new Error(
            insertResult.error.message ||
              "Unable to save the updated availability.",
          );
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["availability-grid", employeeId, weekStart],
      });
      await refetchAll();
    },
    [employeeId, queryClient, refetchAll, weekStart],
  );

  if (isFallbackData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {t("schedule.myAvailability")}
          </CardTitle>
          <CardDescription>
            {t("schedule.connectToYourSchedulingDataToEnableAvailability")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40 bg-primary/5 text-primary">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>{t("schedule.previewMode")}</AlertTitle>
            <AlertDescription>
              {t("schedule.theScheduleIsCurrentlyShowingDemoDataOnce")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (profileLoading || schedulingLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <LoadingSpinner text={t("schedule.loadingYourAvailability")} />
        </CardContent>
      </Card>
    );
  }

  if (!profile || !employeeId) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <Alert variant="destructive" className="border-destructive/40">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <AlertTitle>{t("schedule.noProfileFound")}</AlertTitle>
            <AlertDescription>
              {t("schedule.couldNotLoadProfileInformation")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (availabilityQuery.isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <LoadingSpinner text={t("schedule.preparingAvailabilityEditor")} />
        </CardContent>
      </Card>
    );
  }

  if (availabilityQuery.error) {
    const error = availabilityQuery.error as Error;
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <Alert variant="destructive" className="border-destructive/40">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <AlertTitle>{t("schedule.couldNotLoadAvailability")}</AlertTitle>
            <AlertDescription>
              {error.message || t("schedule.pleaseTryAgainInAFewMoments")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border bg-background shadow-sm", className)}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {t("schedule.myAvailability")}
          </CardTitle>
          <CardDescription>
            {t("schedule.theseHoursAreOnlyYoursTheyDoNot")}
          </CardDescription>
        </div>
        <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
          Week of {dayjs(weekStart).format("MMM D, YYYY")}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert
          className={cn(
            "border-primary/30",
            (availabilityQuery.data?.length ?? 0) === 0 && "border-dashed",
          )}
        >
          <CalendarCheck className="h-5 w-5 text-primary" />
          <AlertTitle>
            {(availabilityQuery.data?.length ?? 0) === 0
              ? "No availability saved yet"
              : "Update as needed"}
          </AlertTitle>
          <AlertDescription>
            {t("schedule.chooseTheHoursYouPreferToWorkEach")}
          </AlertDescription>
        </Alert>

        <AvailabilityRequestForm
          orgId={orgId}
          employeeId={employeeId}
          weekStart={weekStart}
          initialAvailability={initialGrid}
          initialRepeats={initialRepeats}
          onSaveDirect={handleDirectSave}
        />
      </CardContent>
    </Card>
  );
}
