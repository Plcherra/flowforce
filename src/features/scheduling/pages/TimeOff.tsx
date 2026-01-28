import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useSchedulingConsolidated } from "@/hooks/scheduling/useSchedulingConsolidated";
import {
  asArray,
  safeArrayFilter,
  safeArrayReduce,
  safeArrayLength,
  safeArrayMap,
} from "@/utils/reactQueryTypes";
import type { TimeOffWithUser } from "@/hooks/scheduling/types";
import {
  Calendar,
  Plus,
  Clock,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  addDays,
  differenceInDays,
  format,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

const TIME_OFF_ALLOWANCE_DAYS = 25;

type ApprovalStatus = "requested" | "approved" | "denied";

const STATUS_META: Record<
  ApprovalStatus,
  { label: string; color: string; Icon: typeof Clock }
> = {
  requested: {
    label: "Requested",
    color: "bg-amber-100 text-amber-900",
    Icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700",
    Icon: Check,
  },
  denied: { label: "Denied", color: "bg-red-100 text-red-700", Icon: X },
};

const TYPE_META: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-800",
  sick: "bg-red-100 text-red-700",
  personal: "bg-purple-100 text-purple-800",
  emergency: "bg-orange-100 text-orange-800",
  family: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800",
};

function formatRange(start: string | null, end: string | null) {
  if (!start || !end) return "Dates pending";
  try {
    const parsedStart = parseISO(start);
    const parsedEnd = parseISO(end);
    return `${format(parsedStart, "MMM d")} – ${format(parsedEnd, "MMM d, yyyy")}`;
  } catch (_error) {
    return "Dates unavailable";
  }
}

function calculateDays(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  try {
    return Math.max(differenceInDays(parseISO(end), parseISO(start)) + 1, 0);
  } catch (_error) {
    return 0;
  }
}

export default function TimeOff() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const userId = profile?.userId ?? profile?.id ?? null;

  const rangeStart = addDays(new Date(), -14);
  const rangeEnd = addDays(new Date(), 30);

  const {
    timeOffRequests: timeOffRequestsData,
    shifts: shiftsData,
    loading,
    error,
    refetchAll,
  } = useSchedulingConsolidated({
    companyId,
    start: rangeStart,
    end: rangeEnd,
    enabled: Boolean(companyId),
  });

  const timeOffRequests = asArray(timeOffRequestsData);
  const shifts = asArray(shiftsData);

  const canManageRequests = useMemo(() => {
    if (!profile?.role) return false;
    const normalized = profile.role.toLowerCase();
    return [
      "admin",
      "manager",
      "company_admin",
      "owner",
      "supervisor",
    ].includes(normalized);
  }, [profile?.role]);

  const summary = useMemo(() => {
    const requested = safeArrayFilter(
      timeOffRequests,
      (request) => request.status === "requested",
    );
    const approved = safeArrayFilter(
      timeOffRequests,
      (request) => request.status === "approved",
    );
    const denied = safeArrayFilter(
      timeOffRequests,
      (request) => request.status === "denied",
    );

    const approvedDays = safeArrayReduce(
      approved,
      (total, request) => {
        return total + calculateDays(request.start_date, request.end_date);
      },
      0,
    );

    return {
      requested: safeArrayLength(requested),
      approved: safeArrayLength(approved),
      denied: safeArrayLength(denied),
      daysUsed: approvedDays,
      balanceRemaining: Math.max(TIME_OFF_ALLOWANCE_DAYS - approvedDays, 0),
    };
  }, [timeOffRequests]);

  const conflictsByRequest = useMemo(() => {
    if (
      safeArrayLength(timeOffRequests) === 0 ||
      safeArrayLength(shifts) === 0
    ) {
      return new Map<string, number>();
    }

    const map = new Map<string, number>();
    timeOffRequests.forEach((request) => {
      if (!request.start_date || !request.end_date || !request.user_id) {
        map.set(request.id, 0);
        return;
      }

      const start = parseISO(request.start_date);
      const end = parseISO(request.end_date);
      const conflicts = safeArrayFilter(shifts, (shift) => {
        if (!shift.start_time) return false;
        const shiftStart = new Date(shift.start_time);
        if (!isWithinInterval(shiftStart, { start, end })) return false;
        return shift.assignments?.some(
          (assignment) => assignment.user_id === request.user_id,
        );
      });
      const conflictCount = safeArrayLength(conflicts);

      map.set(request.id, conflicts);
    });

    return map;
  }, [timeOffRequests, shifts]);

  const openConflictCount = useMemo(
    () =>
      safeArrayReduce(
        timeOffRequests,
        (total, request) => {
          if (request.status !== "requested") return total;
          return total + (conflictsByRequest.get(request.id) ?? 0);
        },
        0,
      ),
    [timeOffRequests, conflictsByRequest],
  );

  const handleStatusChange = async (
    request: TimeOffWithUser,
    status: "approved" | "denied",
  ) => {
    setUpdatingId(request.id);
    try {
      const { error: updateError } = await supabase
        .from("time_off_requests")
        .update({
          status,
          approved_at: status === "approved" ? new Date().toISOString() : null,
          approved_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast({
        title: status === "approved" ? "Request approved" : "Request denied",
        description: `${request.user?.first_name ?? "Team member"} has been notified.`,
      });
      await refetchAll();
    } catch (updateError) {
      logger.error("Failed to update time-off request", {
        error: updateError,
        tags: ["error"],
      });
      toast({
        title: "Update failed",
        description:
          updateError instanceof Error
            ? updateError.message
            : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const isLoading = loading && safeArrayLength(timeOffRequests) === 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Scheduling Time-Off
          </h1>
          <p className="text-sm text-muted-foreground">
            Coordinate requests against the live schedule and keep coverage
            under control.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetchAll()}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")}
            />
            Sync with schedule
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Request time off
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader className="flex flex-row items-center gap-2 py-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm text-destructive">
              Unable to load time-off data
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive/80">
            {error}
          </CardContent>
        </Card>
      )}

      {!companyId ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">
              Connect your scheduling workspace
            </CardTitle>
            <CardDescription>
              Assign this profile to a company to sync live requests,
              availability, and coverage impact.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requested</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.requested}</div>
                <p className="text-xs text-muted-foreground">
                  Waiting on reviewer action
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.approved}</div>
                <p className="text-xs text-muted-foreground">
                  Confirmed coverage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.balanceRemaining}
                </div>
                <p className="text-xs text-muted-foreground">
                  Days remaining from {TIME_OFF_ALLOWANCE_DAYS}-day allowance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Coverage conflicts
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openConflictCount}</div>
                <p className="text-xs text-muted-foreground">
                  Overlapping shifts awaiting resolution
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Time-off queue</CardTitle>
              <CardDescription>
                Cross-check requests against scheduled shifts and approve
                directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-md bg-muted"
                    />
                  ))}
                </div>
              ) : safeArrayLength(timeOffRequests) === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No time-off requests in the window yet. Employees can submit
                  requests from the mobile app or scheduling workspace.
                </div>
              ) : (
                <div className="space-y-4">
                  {timeOffRequests.map((request) => {
                    const status = (request.status ??
                      "requested") as ApprovalStatus;
                    const statusMeta =
                      STATUS_META[status] ?? STATUS_META.requested;
                    const { Icon } = statusMeta;
                    const conflicts = conflictsByRequest.get(request.id) ?? 0;
                    const totalDays = calculateDays(
                      request.start_date,
                      request.end_date,
                    );
                    const typeStyle =
                      TYPE_META[request.type ?? "other"] ?? TYPE_META.other;

                    return (
                      <div
                        key={request.id}
                        className="flex flex-col gap-4 rounded-lg border p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn(typeStyle, "capitalize")}>
                                {request.type ?? "other"}
                              </Badge>
                              <Badge
                                className={cn("capitalize", statusMeta.color)}
                              >
                                <Icon className="mr-1 h-3.5 w-3.5" />
                                {statusMeta.label}
                              </Badge>
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                              {formatRange(
                                request.start_date,
                                request.end_date,
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {totalDays} day{totalDays === 1 ? "" : "s"} ·
                              Submitted{" "}
                              {request.created_at
                                ? format(
                                    new Date(request.created_at),
                                    "MMM d, yyyy",
                                  )
                                : "recently"}
                            </p>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground">
                                {request.reason}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Requested by {request.user?.first_name}{" "}
                              {request.user?.last_name}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            <div
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-3 py-2",
                                conflicts > 0
                                  ? "border-amber-300 bg-amber-50 text-amber-900"
                                  : "border-muted bg-muted/40",
                              )}
                            >
                              <Users className="h-4 w-4" />
                              <span>
                                {conflicts} overlapping shift
                                {conflicts === 1 ? "" : "s"}
                              </span>
                            </div>
                            {canManageRequests && status === "requested" && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatusChange(request, "denied")
                                  }
                                  disabled={updatingId === request.id}
                                >
                                  Deny
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStatusChange(request, "approved")
                                  }
                                  disabled={updatingId === request.id}
                                >
                                  Approve
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
