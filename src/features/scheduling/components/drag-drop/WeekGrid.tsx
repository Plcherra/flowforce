import { useTranslation } from "react-i18next";
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  isRequestedOffDay,
  type TimeOffSpan,
} from "@/features/scheduling/utils/timeOffRequestDetail";
import {
  groupGridRows,
  personStoreAndRole,
} from "@/features/scheduling/utils/scheduleGridGroups";

interface EmployeeSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  store?: string;
  role?: string;
}

interface UnassignedBucket {
  day: Date;
  shifts: ShiftWithAssignments[];
}

export interface WeekGridProps {
  weekDays: Date[];
  employees: EmployeeSummary[];
  unassignedShifts: UnassignedBucket[];
  vendorEventsByShift: Map<string, VendorEventWithMetadata[]>;
  looseVendorEventsByDay: Map<string, VendorEventWithMetadata[]>;
  cellAvailability: Map<string, Map<string, GridCellAvailability>>;
  shiftsByEmployeeDay: ShiftsByEmployeeDay;
  conflictByShiftId: Map<string, boolean>;
  dailyGridStats: Map<string, DailyGridStats>;
  showAvailabilityLayer?: boolean;
  showGridFooter?: boolean;
  enableShiftDrag?: boolean;
  timeOffRequests?: TimeOffSpan[];
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onShiftClick: (shiftId: string) => void;
  onDrop?: (event: React.DragEvent, day: Date, employeeId?: string) => void;
  onDragOver?: (event: React.DragEvent) => void;
  getVendorLabel: (vendorType: string) => string;
  getVendorColor: (vendorType: string) => string;
  minimizedView?: boolean;
}

const formatName = (employee: EmployeeSummary) =>
  `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() ||
  "Unknown User";

function AvailabilityLegend() {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-wrap items-center gap-3 px-2 py-1.5 text-[10px] text-muted-foreground border-b bg-muted/10"
      data-testid="schedule-availability-legend"
    >
      <span className="font-medium text-foreground">{t("schedule.availability")}</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-destructive/20 border border-destructive/40" />
        {t("schedule.offUnavailable")}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-success/15 border border-success/30" />
        {t("schedule.partial")}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm border-2 border-warning/70 bg-warning/10" />
        {t("schedule.ptoPending")}
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
        <div className="absolute inset-0 pointer-events-none z-[5] bg-success/5 border border-success/20" />
      ) : null}
      {pendingPto ? (
        <div className="absolute inset-0 pointer-events-none z-[5] border-2 border-warning/60 rounded-sm" />
      ) : null}
      {(cell.hint || pendingPto) && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-[6] pointer-events-none px-1 py-0.5 text-[9px] font-medium truncate",
            pendingPto && !cell.hint?.match(/until/i)
              ? "text-warning-foreground"
              : "text-success",
          )}
          data-testid="schedule-cell-availability-hint"
        >
          {cell.hint ?? "PTO pending"}
        </div>
      )}
    </>
  );
}

function GridCellComponent({
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
  minimizedView = false,
  requestedOff = false,
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
  minimizedView?: boolean;
  requestedOff?: boolean;
}) {
  const { t } = useTranslation();
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
      data-minimized={minimizedView ? "true" : "false"}
      className={cn(
        "min-w-0 overflow-hidden border-l border-r relative hover:bg-muted/20 transition-colors p-1",
        minimizedView
          ? "min-h-6"
          : employeeId
            ? "min-h-[52px]"
            : "min-h-[48px]",
        showAvailabilityLayer && cell?.status === "blocked" && "bg-destructive/5",
        enableShiftDrag && isOver && "ring-2 ring-primary/40 bg-primary/5",
      )}
      onDragOver={html5Drop?.onDragOver}
      onDrop={html5Drop?.onDrop}
    >
      {showAvailabilityLayer && employeeId ? (
        <AvailabilityCellOverlay cell={cell} />
      ) : null}
      {requestedOff ? (
        <div
          className="pointer-events-none absolute left-1 top-1 z-[7] rounded bg-warning-muted px-1 text-[10px] font-medium text-warning-foreground"
          data-testid="schedule-requested-off"
        >
          {t("schedule.requestedOff")}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
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
            minimized={minimizedView}
          />
        ))}
        {unlinkedVendorEvents.map((event) => (
          <div
            key={event.id}
            className="relative z-10 rounded-full px-2 py-1 text-[10px] font-medium"
            style={{
              backgroundColor: `${getVendorColor(event.service_type || event.vendor_name || "")}20`,
              color: getVendorColor(event.service_type || event.vendor_name || ""),
            }}
          >
            Vendor · {getVendorLabel(event.service_type || event.vendor_name)}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeRowComponent({
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
  minimizedView = false,
  timeOffRequests = [],
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
  minimizedView?: boolean;
  timeOffRequests?: TimeOffSpan[];
}) {
  const employeeDays = shiftsByEmployeeDay.get(employee.id);

  return (
    <div
      className={cn(
        "grid grid-cols-8 border-b",
        minimizedView ? "min-h-7" : "min-h-[52px]",
      )}
      data-testid="schedule-employee-row"
      data-minimized={minimizedView ? "true" : "false"}
    >
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
            minimizedView={minimizedView}
            requestedOff={isRequestedOffDay(timeOffRequests, employee.id, day)}
          />
        );
      })}
    </div>
  );
}

const GridCell = memo(GridCellComponent);
const EmployeeRow = memo(EmployeeRowComponent);

export function WeekGrid({
  weekDays,
  employees,
  unassignedShifts,
  vendorEventsByShift,
  looseVendorEventsByDay,
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
  minimizedView = false,
  timeOffRequests = [],
}: WeekGridProps) {
  const { t } = useTranslation();
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = scrollContainerRef ?? internalScrollRef;
  const weekKey = weekDays[0]?.toISOString() ?? "";

  useLayoutEffect(() => {
    const scroller = horizontalScrollRef.current;
    if (!scroller) return;
    const alignToday = () => {
      const todayIndex = weekDays.findIndex((day) => isSameDay(day, new Date()));
      if (todayIndex < 0) return;
      if (scroller.scrollWidth <= scroller.clientWidth + 1) return;
      const columnWidth = scroller.scrollWidth / 8;
      const columnEnd = columnWidth * (todayIndex + 2);
      scroller.scrollLeft = Math.max(0, columnEnd - scroller.clientWidth + 8);
    };
    alignToday();
    const frame = requestAnimationFrame(alignToday);
    return () => cancelAnimationFrame(frame);
  }, [weekDays, weekKey]);

  const unassignedLookup = useMemo(() => {
    return new Map<string, ShiftWithAssignments[]>(
      unassignedShifts.map(({ day, shifts }) => [day.toISOString(), shifts]),
    );
  }, [unassignedShifts]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(),
  );
  const labeledEmployees = useMemo(
    () =>
      employees.map((employee) => {
        const shifts = [...(shiftsByEmployeeDay.get(employee.id)?.values() ?? [])].flat();
        const label = personStoreAndRole(shifts);
        return { ...employee, store: employee.store ?? label.store, role: employee.role ?? label.role };
      }),
    [employees, shiftsByEmployeeDay],
  );
  const gridRows = useMemo(
    () => groupGridRows(labeledEmployees, collapsedSections),
    [collapsedSections, labeledEmployees],
  );
  const useVirtualization =
    employees.length >= VIRTUALIZE_EMPLOYEE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: gridRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      gridRows[index]?.kind === "section"
        ? 36
        : minimizedView
          ? 28
          : EMPLOYEE_ROW_HEIGHT,
    overscan: 5,
    enabled: useVirtualization,
  });

  const html5DropForCell = useCallback(
    (day: Date, employeeId?: string) => ({
      onDragOver,
      onDrop: onDrop ? (event: React.DragEvent) => onDrop(event, day, employeeId) : undefined,
    }),
    [onDragOver, onDrop],
  );

  const renderEmployeeRow = useCallback(
    (employee: EmployeeSummary) => (
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
        minimizedView={minimizedView}
        timeOffRequests={timeOffRequests}
      />
    ),
    [
      cellAvailability,
      conflictByShiftId,
      enableShiftDrag,
      getVendorColor,
      getVendorLabel,
      html5DropForCell,
      onShiftClick,
      shiftsByEmployeeDay,
      showAvailabilityLayer,
      minimizedView,
      timeOffRequests,
      vendorEventsByShift,
      weekDays,
    ],
  );

  return (
    <div
      ref={horizontalScrollRef}
      className="overflow-x-auto"
      data-testid="schedule-week-grid"
      data-minimized={minimizedView ? "true" : "false"}
    >
      <div className="min-w-[800px]">
        {showAvailabilityLayer ? <AvailabilityLegend /> : null}
        <div className="grid grid-cols-8 border-b bg-background relative z-10">
          <div className="p-2 text-sm font-medium text-muted-foreground">
            {t("schedule.employee")}
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
            {t("schedule.unassignedShifts")}
          </div>
          {weekDays.map((day) => {
            const shifts = unassignedLookup.get(day.toISOString()) ?? [];
            const unlinked = looseVendorEventsByDay.get(dayIso(day)) ?? [];
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
                minimizedView={minimizedView}
              />
            );
          })}
        </div>

        <div className="relative">
          {useVirtualization ? (
            <div
              data-testid="schedule-grid-virtual-body"
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = gridRows[virtualRow.index];
                if (!row) return null;
                return (
                  <div
                    key={row.kind === "section" ? row.id : row.employee.id}
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
                    {row.kind === "section" ? (
                      <button
                        type="button"
                        className="flex w-full items-center justify-between border-b bg-muted/40 px-3 py-2 text-left text-sm font-medium"
                        data-testid="schedule-grid-section"
                        onClick={() =>
                          setCollapsedSections((current) => {
                            const next = new Set(current);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          })
                        }
                      >
                        {row.store} · {row.role} ({row.count})
                      </button>
                    ) : (
                      renderEmployeeRow(row.employee)
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            gridRows.map((row) =>
              row.kind === "section" ? (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full items-center justify-between border-b bg-muted/40 px-3 py-2 text-left text-sm font-medium"
                  data-testid="schedule-grid-section"
                  onClick={() =>
                    setCollapsedSections((current) => {
                      const next = new Set(current);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    })
                  }
                >
                  {row.store} · {row.role} ({row.count})
                </button>
              ) : (
                renderEmployeeRow(row.employee)
              ),
            )
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
