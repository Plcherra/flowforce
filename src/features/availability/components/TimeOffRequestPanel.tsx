import { useMemo, useState } from "react";
import {
  addDays,
  areIntervalsOverlapping,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  Calendar,
  CalendarCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useProfile } from "@/hooks/useProfile";
import { useSearchParams } from "@/lib/router-adapter";
import { useSchedulingRole } from "@/features/scheduling/hooks/useSchedulingRole";
import {
  usePolicySubject,
  useTimeOffPolicies,
} from "@/features/scheduling/hooks/useTimeOffPolicies";
import { timeOffPolicyForSubject } from "@/features/scheduling/utils/companyPolicy";
import {
  balanceLabel,
  remainingBalances,
} from "@/features/scheduling/utils/timeOffPolicy";
import type { AvailabilityGrid } from "@/features/availability/components/AvailabilityRequestForm";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useCan } from "@/hooks/useCan";
import {
  timeOffStatusLabel,
  timeOffStatusTranslationKey,
  timeOffTypeTranslationKey,
} from "@/features/scheduling/utils/timeOffRequestDetail";
import { TimeOffSummaryTile } from "@/features/availability/components/TimeOffSummaryTile";
import {
  BASE_TIME_OFF_ALLOWANCE,
  REQUEST_TYPES,
  STATUS_STYLES,
  TYPE_STYLES,
  calculateAvailabilityHours,
  dayCount,
  formatRange,
  type TimeOffType,
} from "@/features/availability/components/timeOffRequestPanelShared";

type TimeOffRequestPanelProps = {
  employeeId?: string | null;
  availabilityGrid?: AvailabilityGrid;
};

export function TimeOffRequestPanel({
  employeeId,
  availabilityGrid,
}: TimeOffRequestPanelProps) {
  const { t } = useTranslation();
  const { can } = useCan();
  const canRequestTimeOff = can("timeoff.request");
  const { toast } = useToast();
  const { profile } = useProfile();
  const schedulingRole = useSchedulingRole();
  const [, setSearchParams] = useSearchParams();
  const { timeOff, shifts, loading, isFallbackData, mutations } =
    useScheduling();
  const { companyPolicies } = useTimeOffPolicies(profile?.companyId ?? null);
  const baseSubject = usePolicySubject();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestPolicyId, setRequestPolicyId] = useState("");
  const [requestType, setRequestType] = useState<TimeOffType>("vacation");
  const [requestStart, setRequestStart] = useState("");
  const [requestEnd, setRequestEnd] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availabilityHours = useMemo(
    () => calculateAvailabilityHours(availabilityGrid),
    [availabilityGrid],
  );

  const personalRequests = useMemo(
    () =>
      !employeeId
        ? []
        : timeOff.filter((request) => request.user_id === employeeId),
    [employeeId, timeOff],
  );

  const approvedDays = useMemo(
    () =>
      personalRequests
        .filter((request) => request.status === "approved")
        .reduce(
          (total, request) =>
            total + dayCount(request.start_date, request.end_date),
          0,
        ),
    [personalRequests],
  );

  const requestedDays = useMemo(
    () =>
      personalRequests
        .filter((request) => request.status === "pending")
        .reduce(
          (total, request) =>
            total + dayCount(request.start_date, request.end_date),
          0,
        ),
    [personalRequests],
  );

  const requestedRequestCount = useMemo(
    () =>
      personalRequests.filter((request) => request.status === "pending")
        .length,
    [personalRequests],
  );

  const applicablePolicies = useMemo(
    () =>
      companyPolicies.flatMap((policy) => {
        const match = timeOffPolicyForSubject(policy, {
          ...baseSubject,
          userId: employeeId ?? baseSubject.userId,
        });
        return match ? [match] : [];
      }),
    [baseSubject, companyPolicies, employeeId],
  );
  const policyBalances = useMemo(
    () =>
      remainingBalances({
        policies: applicablePolicies,
        usage: personalRequests.map((request) => ({
          policyId: request.policy_id ?? "",
          startDate: request.start_date,
          endDate: request.end_date,
          status: request.status ?? "",
        })),
        userId: employeeId,
        roleId: profile?.roleId,
        asOf: new Date().toISOString().slice(0, 10),
      }),
    [applicablePolicies, employeeId, personalRequests, profile?.roleId],
  );
  const allowanceRemaining = Math.max(
    BASE_TIME_OFF_ALLOWANCE - approvedDays,
    0,
  );

  const myUpcomingShifts = useMemo(() => {
    if (!employeeId) return [];

    const horizonEnd = addDays(new Date(), 45);
    return shifts.filter((shift) => {
      if (!shift.start_time || !shift.end_time) return false;
      const assigned =
        shift.user_id === employeeId ||
        shift.assignments?.some(
          (assignment) => assignment.user_id === employeeId,
        );
      if (!assigned) return false;
      const shiftStart = new Date(shift.start_time);
      return shiftStart >= new Date() && shiftStart <= horizonEnd;
    });
  }, [employeeId, shifts]);

  const conflictsByRequest = useMemo(() => {
    if (!employeeId) return new Map<string, typeof myUpcomingShifts>();
    const map = new Map<string, typeof myUpcomingShifts>();

    personalRequests.forEach((request) => {
      const start = startOfDay(parseISO(request.start_date));
      const end = endOfDay(parseISO(request.end_date));
      const overlaps = myUpcomingShifts.filter((shift) => {
        if (!shift.start_time || !shift.end_time) return false;
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = new Date(shift.end_time);
        return areIntervalsOverlapping(
          { start: shiftStart, end: shiftEnd },
          { start, end },
          { inclusive: true },
        );
      });
      map.set(request.id, overlaps);
    });

    return map;
  }, [employeeId, personalRequests, myUpcomingShifts]);

  const requestedConflicts = useMemo(() => {
    let total = 0;
    personalRequests.forEach((request) => {
      if (request.status !== "pending") return;
      total += conflictsByRequest.get(request.id)?.length ?? 0;
    });
    return total;
  }, [conflictsByRequest, personalRequests]);

  const handleSubmitRequest = async () => {
    if (!employeeId) {
      toast({
        title: t("literals.profileMissing"),
        description:
          t("literals.weCouldNotResolveYourProfileRefreshAnd"),
        variant: "destructive",
      });
      return;
    }

    if (!requestStart || !requestEnd) {
      toast({
        title: t("literals.datesRequired"),
        description:
          t("literals.selectBothAStartAndEndDateFor"),
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(requestStart);
    const endDate = new Date(requestEnd);

    if (endDate < startDate) {
      toast({
        title: t("literals.invalidRange"),
        description: t("literals.endDateMustBeAfterTheStartDate"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const success = await mutations.requestTimeOff({
        userId: employeeId,
        startDate: requestStart,
        endDate: requestEnd,
        type: requestType,
        reason: requestReason || undefined,
        policyId: applicablePolicies.length > 0 ? requestPolicyId : null,
        policies: applicablePolicies,
        roleId: profile?.roleId,
        asOf: new Date().toISOString().slice(0, 10),
        usage: personalRequests.map((request) => ({
          policyId: request.policy_id ?? "",
          startDate: request.start_date,
          endDate: request.end_date,
          status: request.status ?? "",
        })),
      });

      if (success) {
        toast({
          title: t("literals.timeOffRequested"),
          description: t("literals.yourRequestHasBeenSubmittedForApproval"),
        });
        setRequestDialogOpen(false);
        setRequestStart("");
        setRequestEnd("");
        setRequestReason("");
        setRequestType("vacation");
      } else {
        toast({
          title: t("literals.unableToSubmitRequest"),
          description: t("literals.pleaseTryAgainLater"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("literals.errorSubmittingRequest"),
        description: error instanceof Error ? error.message : t("literals.pleaseTryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isFallbackData) {
    return (
      <Card className="border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />{t("availability.timeOffTracker")}</CardTitle>
          <CardDescription>{t("availability.connectToSupabaseToSyncRealTimeOff")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
            {t("literals.schedulingDataIsInPreviewModeSoWe")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-background shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5 text-primary" />{t("availability.timeOffCoverage")}</CardTitle>
          <CardDescription>{t("availability.trackRequestsBalancesAndHowTimeOffOverlaps")}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {schedulingRole.canApproveRequests ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="company-policies-link"
              onClick={() =>
                setSearchParams((current) => {
                  const next = new URLSearchParams(current);
                  next.set("panel", "company-policies");
                  return next;
                })
              }
            >
              {t("schedule.companyPolicies")}
            </Button>
          ) : null}
          {canRequestTimeOff ? (
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!employeeId || loading}
              data-testid="time-off-request-btn"
            >
              {t("schedule.requestTimeOff")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("availability.submitTimeOffRequest")}</DialogTitle>
              <DialogDescription>{t("availability.chooseTheDateRangeAndTypeOfTime")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {applicablePolicies.length > 0 ? (
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-policy">{t("dashboard.policy")}</Label>
                  <Select value={requestPolicyId} onValueChange={setRequestPolicyId}>
                    <SelectTrigger id="timeoff-policy">
                      <SelectValue placeholder={t("availability.chooseAPolicy")} />
                    </SelectTrigger>
                    <SelectContent>
                      {applicablePolicies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="timeoff-type">{t("resources.details.type")}</Label>
                <Select
                  value={requestType}
                  onValueChange={(value) =>
                    setRequestType(value as TimeOffType)
                  }
                >
                  <SelectTrigger id="timeoff-type">
                    <SelectValue placeholder={t("messages.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(timeOffTypeTranslationKey(type))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-start">{t("schedule.startDate")}</Label>
                  <Input
                    id="timeoff-start"
                    type="date"
                    value={requestStart}
                    onChange={(event) => setRequestStart(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-end">{t("schedule.endDate")}</Label>
                  <Input
                    id="timeoff-end"
                    type="date"
                    value={requestEnd}
                    onChange={(event) => setRequestEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timeoff-reason">{t("availability.notesForYourManagerOptional")}</Label>
                <Input
                  id="timeoff-reason"
                  placeholder={t("availability.contextForYourRequest")}
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setRequestDialogOpen(false)}
              >{t("common.cancel")}</Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={submitting || loading}
              >
                {submitting ? t("literals.submitting") : t("literals.submitRequest")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {policyBalances.length > 0 ? (
            <div className="space-y-1 sm:col-span-2" data-testid="time-off-balances">
              {policyBalances.map((balance) => (
                <p key={balance.policy.id} className="text-sm">
                  {balance.policy.name}: {balanceLabel(balance)}
                </p>
              ))}
            </div>
          ) : (
            <TimeOffSummaryTile
              icon={Calendar}
              label={t("availability.balanceRemaining")}
              value={t("schedule.timeOffDaysCount", { count: allowanceRemaining })}
              hint={t("schedule.timeOffAllowanceUsedHint", {
                used: approvedDays,
                total: BASE_TIME_OFF_ALLOWANCE,
              })}
            />
          )}
          <TimeOffSummaryTile
            icon={CheckCircle2}
            label={t("inventory.requested")}
            value={t("schedule.timeOffOpenRequests", {
              count: requestedRequestCount,
            })}
            hint={
              requestedDays === 1
                ? t("schedule.timeOffOneDayAwaitingApproval")
                : t("schedule.timeOffDaysAwaitingApproval", {
                    count: requestedDays,
                  })
            }
            tone={requestedRequestCount > 0 ? "warning" : "default"}
          />
          <TimeOffSummaryTile
            icon={Clock}
            label={t("availability.weeklyAvailability")}
            value={t("schedule.timeOffAvailabilityHours", {
              hours: availabilityHours,
            })}
            hint={t("schedule.timeOffConfiguredAvailabilityHint")}
          />
          <TimeOffSummaryTile
            icon={AlertTriangle}
            label={t("availability.coverageImpact")}
            value={
              requestedConflicts === 1
                ? t("schedule.timeOffOneShiftOverlapping")
                : t("schedule.timeOffShiftsOverlapping", {
                    count: requestedConflicts,
                  })
            }
            hint={t("schedule.timeOffCoverageShiftsHint")}
            tone={requestedConflicts > 0 ? "warning" : "default"}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("availability.requestHistory")}</h3>
            {personalRequests.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("literals.updated")}
                {format(
                  new Date(personalRequests[0].created_at ?? new Date()),
                  "MMM d, yyyy",
                )}
              </span>
            )}
          </div>
          {personalRequests.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">{t("availability.noTimeOffRequestsYetSubmitYourFirst")}</div>
          ) : (
            <ScrollArea className="mt-3 max-h-80 pr-3">
              <div className="space-y-3">
                {personalRequests.map((request) => {
                  const conflicts = conflictsByRequest.get(request.id) ?? [];
                  const policyName = companyPolicies.find(
                    (policy) => policy.id === request.policy_id,
                  )?.name;
                  return (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border bg-muted/20 p-4 transition hover:border-primary/50"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">
                              {formatRange(
                                request.start_date,
                                request.end_date,
                              )}
                            </h4>
                            <Badge
                              className={cn(
                                "border text-xs",
                                TYPE_STYLES[
                                  (request.type as TimeOffType) ?? "other"
                                ] ?? TYPE_STYLES.other,
                              )}
                            >
                              {t(
                                timeOffTypeTranslationKey(
                                  (request.type as TimeOffType) ?? "other",
                                ),
                              )}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {dayCount(request.start_date, request.end_date)} {t("literals.day")}
                            {dayCount(request.start_date, request.end_date) ===
                            1
                              ? ""
                              : "s"}{" "}
                            {t("literals.requested")}{" "}
                            {format(
                              new Date(
                                request.created_at ?? request.start_date,
                              ),
                              "MMM d, yyyy",
                            )}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground/90">
                              “{request.reason}”
                            </p>
                          )}
                          {policyName ? (
                            <p className="text-xs text-muted-foreground" data-testid="time-off-request-policy">
                              {t("dashboard.policy")}: {policyName}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          className={cn(
                            "border text-xs",
                            STATUS_STYLES[
                              timeOffStatusLabel(request.status)
                            ] ?? STATUS_STYLES.pending,
                          )}
                          data-testid="time-off-request-status"
                        >
                          {t(timeOffStatusTranslationKey(request.status))}
                        </Badge>
                      </div>
                      {conflicts.length > 0 && (
                        <div className="mt-3 rounded-md border border-warning/40 bg-warning-muted p-3 text-xs text-warning-foreground">
                          <div className="mb-1 flex items-center gap-1 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />{t("availability.coverageImpact")}</div>
                          <ul className="space-y-1">
                            {conflicts.map((shift) => (
                              <li
                                key={shift.id}
                                className="flex justify-between gap-2"
                              >
                                <span className="truncate">
                                  {shift.title ?? t("literals.scheduledShift")} ·{" "}
                                  {format(new Date(shift.start_time!), "MMM d")}
                                </span>
                                <span className="text-muted-foreground">
                                  {format(new Date(shift.start_time!), "p")} –{" "}
                                  {format(new Date(shift.end_time!), "p")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
