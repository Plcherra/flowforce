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
  rangesFromGrid,
  type StaffAvailabilityRow,
} from "@/features/availability/utils/availabilityUtils";
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
          "id, user_id, day_of_week, start_time, end_time, week_start_date",
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

  const handleDirectSave = useCallback(
    async (nextGrid: AvailabilityGrid) => {
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

      if (ranges.length > 0) {
        const insertRows = ranges.map((range) => ({
          user_id: employeeId,
          day_of_week: range.dayOfWeek,
          start_time: range.startTime,
          end_time: range.endTime,
          week_start_date: weekStart,
          is_preferred: true,
        }));
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
            My Availability
          </CardTitle>
          <CardDescription>
            Connect to your scheduling data to enable availability editing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40 bg-primary/5 text-primary">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Preview mode</AlertTitle>
            <AlertDescription>
              The schedule is currently showing demo data. Once Supabase tables
              are available this section will let you adjust your working
              preferences.
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
          <LoadingSpinner text="Loading your availability..." />
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
            <AlertTitle>No profile found</AlertTitle>
            <AlertDescription>
              We couldn&apos;t load your profile information. Try reloading the
              page or contact your manager for help.
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
          <LoadingSpinner text="Preparing your availability editor..." />
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
            <AlertTitle>Couldn&apos;t load availability</AlertTitle>
            <AlertDescription>
              {error.message || "Please try again in a few moments."}
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
            My Availability
          </CardTitle>
          <CardDescription>
            Select when you&apos;re free to work. Submit a request if this week
            is locked by your manager.
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
            Choose the hours you prefer to work each day. Locked weeks still let
            you submit a change request for manager approval.
          </AlertDescription>
        </Alert>

        <AvailabilityRequestForm
          orgId={orgId}
          employeeId={employeeId}
          weekStart={weekStart}
          initialAvailability={initialGrid}
          onSaveDirect={handleDirectSave}
        />
      </CardContent>
    </Card>
  );
}
