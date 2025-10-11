import { differenceInMinutes, format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ShiftWithAssignments, VendorEventWithMetadata } from '@/hooks/scheduling/useSchedulingConsolidated';

interface EmployeeSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface UnassignedBucket {
  day: Date;
  shifts: ShiftWithAssignments[];
}

interface WeekGridProps {
  weekDays: Date[];
  employees: EmployeeSummary[];
  weekSchedules: ShiftWithAssignments[];
  unassignedShifts: UnassignedBucket[];
  vendorEvents: VendorEventWithMetadata[];
  vendorEventsByShift: Map<string, VendorEventWithMetadata[]>;
  disabledDates: Map<string, Set<string>>;
  onShiftClick: (shiftId: string) => void;
  onDrop: (event: React.DragEvent, day: Date, employeeId?: string) => void;
  onDragOver: (event: React.DragEvent) => void;
  getVendorLabel: (vendorType: string) => string;
  getVendorColor: (vendorType: string) => string;
}

const formatName = (employee: EmployeeSummary) =>
  `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || 'Unknown User';

const formatShiftWindow = (schedule: ShiftWithAssignments) => {
  if (!schedule.start_time || !schedule.end_time) return 'Invalid time';
  return `${format(new Date(schedule.start_time), 'HH:mm')} - ${format(new Date(schedule.end_time), 'HH:mm')}`;
};

const formatShiftDuration = (schedule: ShiftWithAssignments) => {
  if (!schedule.start_time || !schedule.end_time) return '0 hrs';
  const start = new Date(schedule.start_time);
  const end = new Date(schedule.end_time);
  const minutes = differenceInMinutes(end, start);
  const hours = Math.max(0, minutes / 60);
  if (!Number.isFinite(hours) || hours <= 0) return '0 hrs';
  const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
  return `${rounded.toFixed(rounded % 1 === 0 ? 0 : 1)} hrs`;
};

export function WeekGrid({
  weekDays,
  employees,
  weekSchedules,
  unassignedShifts,
  vendorEvents,
  vendorEventsByShift,
  disabledDates,
  onShiftClick,
  onDrop,
  onDragOver,
  getVendorLabel,
  getVendorColor,
}: WeekGridProps) {
  const unassignedLookup = new Map<string, ShiftWithAssignments[]>(
    unassignedShifts.map(({ day, shifts }) => [day.toISOString(), shifts]),
  );

  const unlinkedVendorEvents = (day: Date) =>
    vendorEvents.filter((event) => !event.shift_id && event.event_date && isSameDay(new Date(event.event_date), day));

  const dayIso = (day: Date) => day.toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-8 border-b bg-background relative z-10">
          <div className="p-2 text-sm font-medium text-muted-foreground">Employee</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-2 text-center border-l">
              <div className="font-medium text-sm">{format(day, 'EEE')}</div>
              <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 border-b bg-muted/20 relative z-0">
          <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center">
            Unassigned shifts
          </div>
          {weekDays.map((day) => {
            const shifts = unassignedLookup.get(day.toISOString()) ?? [];
            const unlinked = unlinkedVendorEvents(day);
            return (
              <div
                key={`unassigned-${day.toISOString()}`}
                className="border-l border-r relative min-h-[48px] p-1"
                onDragOver={onDragOver}
                onDrop={(event) => onDrop(event, day)}
              >
                <div className="flex flex-wrap gap-1">
                  {shifts.map((schedule) => (
                    <button
                      type="button"
                      key={schedule.id}
                      className="relative z-10 rounded px-2 py-1 text-[11px] bg-background border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      title={formatShiftWindow(schedule)}
                      onClick={() => onShiftClick(schedule.id)}
                    >
                      <div className="font-medium truncate">{schedule.title ?? schedule.job_position?.name ?? 'Shift'}</div>
                      <div className="text-xs opacity-75">{formatShiftWindow(schedule)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatShiftDuration(schedule)}
                        {schedule.required_headcount ? ` · ${schedule.required_headcount} req.` : ''}
                      </div>
                    </button>
                  ))}
                  {unlinked.map((event) => (
                    <div
                      key={event.id}
                      className="relative z-10 rounded-full px-2 py-1 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${getVendorColor(event.vendor_type)}20`,
                        color: getVendorColor(event.vendor_type),
                      }}
                    >
                      Vendor · {getVendorLabel(event.vendor_type)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative">
          {employees.map((employee) => (
            <div key={employee.id} className="grid grid-cols-8 border-b min-h-[64px]">
              <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={employee.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {employee.first_name?.[0]}
                    {employee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{formatName(employee)}</span>
              </div>

              {weekDays.map((day) => {
                const daySchedules = weekSchedules.filter((schedule) => {
                  const start = new Date(schedule.start_time);
                  return (
                    isSameDay(start, day) &&
                    (schedule.assignments ?? []).some((assignment) => assignment.user_id === employee.id)
                  );
                });

                const isDisabled = disabledDates.get(employee.id)?.has(dayIso(day));
                return (
                  <div
                    key={`${employee.id}-${day.toISOString()}`}
                    className="border-l border-r relative min-h-[64px] hover:bg-muted/20 transition-colors p-1"
                    onDragOver={onDragOver}
                    onDrop={(event) => onDrop(event, day, employee.id)}
                  >
                    {isDisabled && (
                      <div className="absolute inset-0 bg-destructive/10 text-destructive text-[10px] flex items-start p-1 pointer-events-none z-5 border border-destructive/30">
                        Unavailable
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {daySchedules.map((schedule) => (
                        <button
                          type="button"
                          key={schedule.id}
                          className="relative z-20 rounded px-2 py-1 text-[11px] cursor-pointer hover:shadow-md transition-all duration-200 bg-background border"
                          style={{
                            backgroundColor: `${schedule.color ?? '#3b82f6'}15`,
                            borderLeft: `3px solid ${schedule.color ?? '#3b82f6'}`,
                          }}
                          title={formatShiftWindow(schedule)}
                          onClick={() => onShiftClick(schedule.id)}
                        >
                          <div className="font-medium truncate">
                            {schedule.title ?? schedule.job_position?.name ?? 'Shift'}
                          </div>
                          <div className="text-xs opacity-75">{formatShiftWindow(schedule)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatShiftDuration(schedule)}
                            {schedule.required_headcount ? ` · ${schedule.required_headcount} req.` : ''}
                          </div>
                          {(vendorEventsByShift.get(schedule.id) ?? []).map((event) => (
                            <div
                              key={`${event.id}-chip`}
                              className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${getVendorColor(event.vendor_type)}15`,
                                color: getVendorColor(event.vendor_type),
                              }}
                            >
                              Vendor · {getVendorLabel(event.vendor_type)}
                            </div>
                          ))}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
