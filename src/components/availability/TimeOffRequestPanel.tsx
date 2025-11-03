import { useMemo, useState, type ComponentType } from 'react';
import {
  addDays,
  areIntervalsOverlapping,
  differenceInCalendarDays,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from 'date-fns';
import { Calendar, CalendarCheck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduling } from '@/contexts/SchedulingContext';
import type { AvailabilityGrid } from '@/components/availability/AvailabilityRequestForm';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const BASE_TIME_OFF_ALLOWANCE = 25; // matches summary used in standalone Time Off page

type TimeOffRequestPanelProps = {
  employeeId?: string | null;
  availabilityGrid?: AvailabilityGrid;
};

type TimeOffType = 'vacation' | 'sick' | 'personal' | 'other';
type TimeOffStatus = 'requested' | 'approved' | 'denied';

const STATUS_STYLES: Record<TimeOffStatus, string> = {
  requested: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  denied: 'bg-rose-100 text-rose-800 border-rose-200',
};

const TYPE_STYLES: Record<TimeOffType, string> = {
  vacation: 'bg-sky-100 text-sky-800 border-sky-200',
  sick: 'bg-rose-100 text-rose-800 border-rose-200',
  personal: 'bg-purple-100 text-purple-800 border-purple-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const TIME_OFF_TYPE_LABEL: Record<TimeOffType, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
  other: 'Other',
};

const REQUEST_TYPES: TimeOffType[] = ['vacation', 'sick', 'personal', 'other'];

function calculateAvailabilityHours(grid?: AvailabilityGrid) {
  if (!grid) return 0;
  return Object.values(grid).reduce((total, hours) => total + (Array.isArray(hours) ? hours.length : 0), 0);
}

function formatRange(start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (differenceInCalendarDays(endDate, startDate) === 0) {
    return format(startDate, 'MMM d, yyyy');
  }
  return `${format(startDate, 'MMM d, yyyy')} → ${format(endDate, 'MMM d, yyyy')}`;
}

function dayCount(start: string, end: string) {
  return differenceInCalendarDays(endOfDay(parseISO(end)), startOfDay(parseISO(start))) + 1;
}

export function TimeOffRequestPanel({ employeeId, availabilityGrid }: TimeOffRequestPanelProps) {
  const { toast } = useToast();
  const { timeOff, shifts, loading, isFallbackData, mutations } = useScheduling();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<TimeOffType>('vacation');
  const [requestStart, setRequestStart] = useState('');
  const [requestEnd, setRequestEnd] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availabilityHours = useMemo(() => calculateAvailabilityHours(availabilityGrid), [availabilityGrid]);

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
        .filter((request) => request.status === 'approved')
        .reduce((total, request) => total + dayCount(request.start_date, request.end_date), 0),
    [personalRequests],
  );

  const requestedDays = useMemo(
    () =>
      personalRequests
        .filter((request) => request.status === 'requested')
        .reduce((total, request) => total + dayCount(request.start_date, request.end_date), 0),
    [personalRequests],
  );

  const requestedRequestCount = useMemo(
    () => personalRequests.filter((request) => request.status === 'requested').length,
    [personalRequests],
  );

  const allowanceRemaining = Math.max(BASE_TIME_OFF_ALLOWANCE - approvedDays, 0);

  const myUpcomingShifts = useMemo(() => {
    if (!employeeId) return [];

    const horizonEnd = addDays(new Date(), 45);
    return shifts.filter((shift) => {
      if (!shift.start_time || !shift.end_time) return false;
      const assigned =
        shift.user_id === employeeId ||
        shift.assignments?.some((assignment) => assignment.user_id === employeeId);
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
      if (request.status !== 'requested') return;
      total += conflictsByRequest.get(request.id)?.length ?? 0;
    });
    return total;
  }, [conflictsByRequest, personalRequests]);

  const handleSubmitRequest = async () => {
    if (!employeeId) {
      toast({
        title: 'Profile missing',
        description: 'We could not resolve your profile. Refresh and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (!requestStart || !requestEnd) {
      toast({
        title: 'Dates required',
        description: 'Select both a start and end date for your time off request.',
        variant: 'destructive',
      });
      return;
    }

    const startDate = new Date(requestStart);
    const endDate = new Date(requestEnd);

    if (endDate < startDate) {
      toast({
        title: 'Invalid range',
        description: 'End date must be after the start date.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const success = await mutations.requestTimeOff({
      userId: employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: requestType,
      reason: requestReason || undefined,
    });
    setSubmitting(false);

    if (success) {
      setRequestDialogOpen(false);
      setRequestStart('');
      setRequestEnd('');
      setRequestReason('');
      setRequestType('vacation');
    }
  };

  if (isFallbackData) {
    return (
      <Card className="border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Time Off Tracker
          </CardTitle>
          <CardDescription>Connect to Supabase to sync real time-off requests and balances.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
            Scheduling data is in preview mode, so we can&apos;t show live balance or request history yet.
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
            <CalendarCheck className="h-5 w-5 text-primary" />
            Time Off & Coverage
          </CardTitle>
          <CardDescription>
            Track requests, balances, and how time off overlaps with your scheduled shifts.
          </CardDescription>
        </div>
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!employeeId || loading}>
              Request time off
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit time off request</DialogTitle>
              <DialogDescription>
                Choose the date range and type of time off. Your supervisor will be notified for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="timeoff-type">Type</Label>
                <Select value={requestType} onValueChange={(value) => setRequestType(value as TimeOffType)}>
                  <SelectTrigger id="timeoff-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TIME_OFF_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-start">Start date</Label>
                  <Input
                    id="timeoff-start"
                    type="date"
                    value={requestStart}
                    onChange={(event) => setRequestStart(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-end">End date</Label>
                  <Input
                    id="timeoff-end"
                    type="date"
                    value={requestEnd}
                    onChange={(event) => setRequestEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timeoff-reason">Notes for your manager (optional)</Label>
                <Input
                  id="timeoff-reason"
                  placeholder="Context for your request"
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest} disabled={submitting || loading}>
                {submitting ? 'Submitting...' : 'Submit request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryTile
            icon={Calendar}
            label="Balance remaining"
            value={`${allowanceRemaining} days`}
            hint={`You’ve used ${approvedDays} of ${BASE_TIME_OFF_ALLOWANCE} days`}
          />
          <SummaryTile
            icon={CheckCircle2}
            label="Requested"
            value={`${requestedRequestCount} open`}
            hint={`${requestedDays} day${requestedDays === 1 ? '' : 's'} awaiting approval`}
            tone={requestedRequestCount > 0 ? 'warning' : 'default'}
          />
          <SummaryTile
            icon={Clock}
            label="Weekly availability"
            value={`${availabilityHours} hrs`}
            hint="Configured availability this week"
          />
          <SummaryTile
            icon={AlertTriangle}
            label="Coverage impact"
            value={`${requestedConflicts} shift${requestedConflicts === 1 ? '' : 's'}`}
            hint="Shifts overlapping requested time off"
            tone={requestedConflicts > 0 ? 'warning' : 'default'}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Request history
            </h3>
            {personalRequests.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Updated&nbsp;
                {format(new Date(personalRequests[0].created_at ?? new Date()), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          {personalRequests.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
              No time off requests yet. Submit your first request to see it tracked here alongside coverage impact.
            </div>
          ) : (
            <ScrollArea className="mt-3 max-h-80 pr-3">
              <div className="space-y-3">
                {personalRequests.map((request) => {
                  const conflicts = conflictsByRequest.get(request.id) ?? [];
                  return (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border bg-muted/20 p-4 transition hover:border-primary/50"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">{formatRange(request.start_date, request.end_date)}</h4>
                            <Badge
                              className={cn(
                                'border text-xs capitalize',
                                TYPE_STYLES[(request.type as TimeOffType) ?? 'other'] ?? TYPE_STYLES.other,
                              )}
                            >
                              {TIME_OFF_TYPE_LABEL[(request.type as TimeOffType) ?? 'other'] ?? 'Other'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {dayCount(request.start_date, request.end_date)} day
                            {dayCount(request.start_date, request.end_date) === 1 ? '' : 's'} · Requested{' '}
                            {format(new Date(request.created_at ?? request.start_date), 'MMM d, yyyy')}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground/90">“{request.reason}”</p>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            'border text-xs capitalize',
                                STATUS_STYLES[(request.status as TimeOffStatus) ?? 'requested'] ?? STATUS_STYLES.requested,
                          )}
                        >
                          {request.status}
                        </Badge>
                      </div>
                      {conflicts.length > 0 && (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700">
                          <div className="mb-1 flex items-center gap-1 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Coverage impact
                          </div>
                          <ul className="space-y-1">
                            {conflicts.map((shift) => (
                              <li key={shift.id} className="flex justify-between gap-2">
                                <span className="truncate">
                                  {shift.title ?? 'Scheduled shift'} · {format(new Date(shift.start_time!), 'MMM d')}
                                </span>
                                <span className="text-muted-foreground">
                                  {format(new Date(shift.start_time!), 'p')} – {format(new Date(shift.end_time!), 'p')}
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

interface SummaryTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'warning';
}

function SummaryTile({ icon: Icon, label, value, hint, tone = 'default' }: SummaryTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 shadow-sm transition',
        tone === 'warning' ? 'border-amber-300 bg-amber-50/60' : 'bg-muted/40',
      )}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
        {label}
        <Icon className={cn('h-4 w-4', tone === 'warning' ? 'text-amber-600' : 'text-muted-foreground')} />
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
