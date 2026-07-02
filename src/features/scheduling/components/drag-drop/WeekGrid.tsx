import { useMemo, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDroppable } from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type {
  ShiftWithAssignments,
  VendorEventWithMetadata,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { GridCellAvailability } from "@/types/platform";
import type { DailyGridStats } from "@/features/scheduling/utils/hoursCalculation";
import type { ShiftsByEmployeeDay } from "@/features/scheduling/utils/gridIndexes";
import {
  dayIso,
  EMPLOYEE_ROW_HEIGHT,
  VIRTUALIZE_EMPLOYEE_THRESHOLD,
} from "@/features/scheduling/utils/gridIndexes";
import { ShiftChip } from "@/features/scheduling/components/drag-drop/ShiftChip";
import { WeekGridFooter } from "@/features/scheduling/components/drag-drop/WeekGridFooter";

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

export interface WeekGridProps {
  weekDays: Date[];
  employees: EmployeeSummary[];
  unassignedShifts: UnassignedBucket[];
  vendorEvents: VendorEventWithMetadata[];
  vendorEventsByShift: Map<string, VendorEventWithMetadata[]>;
  cellAvailability: Map<string, Map<string, GridCellAvailability>>;
  shiftsByEmployeeDay: ShiftsByEmployeeDay;
  conflictByShiftId: Map<string, boolean>;
  dailyGridStats: Map<string, DailyGridStats>;
  showAvailabilityLayer?: boolean;
  showGridFooter?: boolean;
  enableShiftDrag?: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onShiftClick: (shiftId: string) => void;
  onDrop?: (event: React.DragEvent, day: Date, employeeId?: string) => void;
  onDragOver?: (event: React.DragEvent) => void;
  getVendorLabel: (vendorType: string) => string;
  getVendorColor: (vendorType: string) => string;
}

const formatName = (employee: EmployeeSummary) =>
  `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() ||
  "Unknown User";

function AvailabilityLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-3 px-2 py-1.5 text-[10px] text-muted-foreground border-b bg-muted/10"
      data-testid="schedule-availability-legend"
    >
      <span className="font-medium text-foreground">Availability</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-destructive/20 border border-destructive/40" />
        Off / Unavailable
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/15 border border-emerald-500/30" />
        Partial
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm border-2 border-amber-500/70 bg-amber-500/10" />
        PTO pending
      </span>
    </div>
  );
}

function AvailabilityCellOverlay({
  cell,
}: {
  cell: GridCellAvailability | undefined;
}) {
  if (!cell) return null;

  const pendingPto = cell.blockers.some(
    (blocker) => blocker.kind === "pto" && blocker.severity === "warning",
  );
  const approvedPto = cell.blockers.some(
    (blocker) => blocker.kind === "pto" && blocker.severity === "blocking",
  );

  if (cell.status === "blocked") {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-[5] border border-destructive/30 bg-destructive/10"
        data-testid="schedule-cell-blocked"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, hsl(var(--destructive) / 0.25) 0 6px, transparent 6px 12px)",
          }}
        />
        <div className="relative p-1 text-[10px] font-medium text-destructive">
          {approvedPto ? "PTO" : (cell.hint ?? "Off")}
        </div>
      </div>
    );
  }

  return (
    <>
      {cell.status === "partial" ? (
        <div className="absolute inset-0 pointer-events-none z-[5] bg-emerald-500/5 border border-emerald-500/20" />
      ) : null}
      {pendingPto ? (
        <div className="absolute inset-0 pointer-events-none z-[5] border-2 border-amber-500/60 rounded-sm" />
      ) : null}
      {(cell.hint || pendingPto) && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-[6] pointer-events-none px-1 py-0.5 text-[9px] font-medium truncate",
            pendingPto && !cell.hint?.match(/until/i)
              ? "text-amber-700 dark:text-amber-300"
              : "text-emerald-700 dark:text-emerald-300",
          )}
          data-testid="schedule-cell-availability-hint"
        >
          {cell.hint ?? "PTO pending"}
        </div>
      )}
    </>
  );
}

function GridCell({
  employeeId,
  day,
  cell,
  daySchedules,
  conflictByShiftId,
  vendorEventsByShift,
  unlinkedVendorEvents = [],
  showAvailabilityLayer,
  enableShiftDrag,
  html5Drop,
  onShiftClick,
  getVendorLabel,
  getVendorColor,
}: {
  employeeId?: string;
  day: Date;
  cell: GridCellAvailability | undefined;
  daySchedules: ShiftWithAssignments[];
  conflictByShiftId: Map<string, boolean>;
  vendorEventsByShift: Map<string, VendorEventWithMetadata[]>;
  unlinkedVendorEvents?: VendorEventWithMetadata[];
  showAvailabilityLayer: boolean;
  enableShiftDrag: boolean;
  html5Drop?: {
    onDragOver?: (event: React.DragEvent) => void;
    onDrop?: (event: React.DragEvent) => void;
  };
  onShiftClick: (shiftId: string) => void;
  getVendorLabel: (vendorType: string) => string;
  getVendorColor: (vendorType: string) => string;
}) {
  const dropId = `${employeeId ?? "unassigned"}-${dayIso(day)}`;
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    disabled: !enableShiftDrag,
    data: {
      type: "cell",
      employeeId: employeeId ?? null,
      day,
    },
  });

  return (
    <div
      ref={enableShiftDrag ? setNodeRef : undefined}
      data-testid={
        employeeId
          ? `schedule-cell-${employeeId}-${dayIso(day)}`
          : `schedule-unassigned-day-${dayIso(day)}`
      }
      className={cn(
        "border-l border-r relative min-h-[52px] hover:bg-muted/20 transition-colors p-1",
        showAvailabilityLayer && cell?.status === "blocked" && "bg-destructive/5",
        enableShiftDrag && isOver && "ring-2 ring-primary/40 bg-primary/5",
        !employeeId && "min-h-[48px]",
      )}
      onDragOver={html5Drop?.onDragOver}
      onDrop={html5Drop?.onDrop}
    >
      {showAvailabilityLayer && employeeId ? (
        <AvailabilityCellOverlay cell={cell} />
      ) : null}
      <div className="flex flex-wrap gap-1">
        {daySchedules.map((schedule) => (
          <ShiftChip
            key={schedule.id}
            schedule={schedule}
            hasConflict={conflictByShiftId.get(schedule.id) ?? false}
            employeeId={employeeId ?? null}
            draggable={enableShiftDrag}
            variant={employeeId ? "assigned" : "unassigned"}
            vendorEvents={vendorEventsByShift.get(schedule.id) ?? []}
            getVendorLabel={getVendorLabel}
            getVendorColor={getVendorColor}
            onShiftClick={onShiftClick}
          />
        ))}
        {unlinkedVendorEvents.map((event) => (
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
}

function EmployeeRow({
  employee,
  weekDays,
  shiftsByEmployeeDay,
  cellAvailability,
  conflictByShiftId,
  vendorEventsByShift,
  showAvailabilityLayer,
  enableShiftDrag,
  html5DropForCell,
  onShiftClick,
  getVendorLabel,
  getVendorColor,
}: {
  employee: EmployeeSummary;
  weekDays: Date[];
  shiftsByEmployeeDay: ShiftsByEmployeeDay;
  cellAvailability: Map<string, Map<string, GridCellAvailability>>;
  conflictByShiftId: Map<string, boolean>;
  vendorEventsByShift: Map<string, VendorEventWithMetadata[]>;
  showAvailabilityLayer: boolean;
  enableShiftDrag: boolean;
  html5DropForCell: (
    day: Date,
    employeeId?: string,
  ) => {
    onDragOver?: (event: React.DragEvent) => void;
    onDrop?: (event: React.DragEvent) => void;
  };
  onShiftClick: (shiftId: string) => void;
  getVendorLabel: (vendorType: string) => string;
  getVendorColor: (vendorType: string) => string;
}) {
  const employeeDays = shiftsByEmployeeDay.get(employee.id);

  return (
    <div className="grid grid-cols-8 border-b min-h-[52px]">
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
        const key = dayIso(day);
        const daySchedules = employeeDays?.get(key) ?? [];
        const cell = cellAvailability.get(employee.id)?.get(key);

        return (
          <GridCell
            key={`${employee.id}-${key}`}
            employeeId={employee.id}
            day={day}
            cell={cell}
            daySchedules={daySchedules}
            conflictByShiftId={conflictByShiftId}
            vendorEventsByShift={vendorEventsByShift}
            showAvailabilityLayer={showAvailabilityLayer}
            enableShiftDrag={enableShiftDrag}
            html5Drop={html5DropForCell(day, employee.id)}
            onShiftClick={onShiftClick}
            getVendorLabel={getVendorLabel}
            getVendorColor={getVendorColor}
          />
        );
      })}
    </div>
  );
}

export function WeekGrid({
  weekDays,
  employees,
  unassignedShifts,
  vendorEvents,
  vendorEventsByShift,
  cellAvailability,
  shiftsByEmployeeDay,
  conflictByShiftId,
  dailyGridStats,
  showAvailabilityLayer = true,
  showGridFooter = true,
  enableShiftDrag = false,
  scrollContainerRef,
  onShiftClick,
  onDrop,
  onDragOver,
  getVendorLabel,
  getVendorColor,
}: WeekGridProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = scrollContainerRef ?? internalScrollRef;

  const unassignedLookup = useMemo(
    () =>
      new Map<string, ShiftWithAssignments[]>(
        unassignedShifts.map(({ day, shifts }) => [day.toISOString(), shifts]),
      ),
    [unassignedShifts],
  );

  const unlinkedByDay = useMemo(() => {
    const map = new Map<string, VendorEventWithMetadata[]>();
    for (const day of weekDays) {
      map.set(
        dayIso(day),
        vendorEvents.filter(
          (event) =>
            !event.shift_id &&
            event.event_date &&
            isSameDay(new Date(event.event_date), day),
        ),
      );
    }
    return map;
  }, [vendorEvents, weekDays]);

  const useVirtualization =
    employees.length >= VIRTUALIZE_EMPLOYEE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => EMPLOYEE_ROW_HEIGHT,
    overscan: 5,
    enabled: employees.length >= VIRTUALIZE_EMPLOYEE_THRESHOLD,
  });

  const html5DropForCell = (day: Date, employeeId?: string) => ({
    onDragOver,
    onDrop: onDrop ? (event: React.DragEvent) => onDrop(event, day, employeeId) : undefined,
  });

  const renderEmployeeRow = (employee: EmployeeSummary) => (
    <EmployeeRow
      key={employee.id}
      employee={employee}
      weekDays={weekDays}
      shiftsByEmployeeDay={shiftsByEmployeeDay}
      cellAvailability={cellAvailability}
      conflictByShiftId={conflictByShiftId}
      vendorEventsByShift={vendorEventsByShift}
      showAvailabilityLayer={showAvailabilityLayer}
      enableShiftDrag={enableShiftDrag}
      html5DropForCell={html5DropForCell}
      onShiftClick={onShiftClick}
      getVendorLabel={getVendorLabel}
      getVendorColor={getVendorColor}
    />
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {showAvailabilityLayer ? <AvailabilityLegend /> : null}
        <div className="grid grid-cols-8 border-b bg-background relative z-10">
          <div className="p-2 text-sm font-medium text-muted-foreground">
            Employee
          </div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-2 text-center border-l">
              <div className="font-medium text-sm">{format(day, "EEE")}</div>
              <div className="text-xs text-muted-foreground">
                {format(day, "MMM d")}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 border-b bg-muted/20 relative z-0">
          <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center">
            Unassigned shifts
          </div>
          {weekDays.map((day) => {
            const shifts = unassignedLookup.get(day.toISOString()) ?? [];
            const unlinked = unlinkedByDay.get(dayIso(day)) ?? [];
            return (
              <GridCell
                key={`unassigned-${dayIso(day)}`}
                day={day}
                cell={undefined}
                daySchedules={shifts}
                conflictByShiftId={conflictByShiftId}
                vendorEventsByShift={vendorEventsByShift}
                unlinkedVendorEvents={unlinked}
                showAvailabilityLayer={false}
                enableShiftDrag={enableShiftDrag}
                html5Drop={html5DropForCell(day)}
                onShiftClick={onShiftClick}
                getVendorLabel={getVendorLabel}
                getVendorColor={getVendorColor}
              />
            );
          })}
        </div>

        <div className="relative">
          {employees.length >= VIRTUALIZE_EMPLOYEE_THRESHOLD ? (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const employee = employees[virtualRow.index];
                if (!employee) return null;
                return (
                  <div
                    key={employee.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {renderEmployeeRow(employee)}
                  </div>
                );
              })}
            </div>
          ) : (
            employees.map(renderEmployeeRow)
          )}
        </div>

        {showGridFooter ? (
          <WeekGridFooter weekDays={weekDays} dailyGridStats={dailyGridStats} />
        ) : null}
      </div>
    </div>
  );
}

export { ShiftChipOverlay } from "@/features/scheduling/components/drag-drop/ShiftChip";
