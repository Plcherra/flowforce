import { differenceInMinutes, format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { shiftChipPaint } from "@/features/scheduling/utils/shiftChipPaint";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";

export function formatShiftWindow(schedule: ShiftWithAssignments) {
  if (!schedule.start_time || !schedule.end_time) return "Invalid time";
  return `${format(new Date(schedule.start_time), "HH:mm")} - ${format(new Date(schedule.end_time), "HH:mm")}`;
}

export function formatShiftDuration(schedule: ShiftWithAssignments) {
  if (!schedule.start_time || !schedule.end_time) return "0 hrs";
  const start = new Date(schedule.start_time);
  const end = new Date(schedule.end_time);
  const minutes = differenceInMinutes(end, start);
  const hours = Math.max(0, minutes / 60);
  if (!Number.isFinite(hours) || hours <= 0) return "0 hrs";
  const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
  return `${rounded.toFixed(rounded % 1 === 0 ? 0 : 1)} hrs`;
}

interface ShiftChipProps {
  schedule: ShiftWithAssignments;
  hasConflict?: boolean;
  employeeId?: string | null;
  draggable?: boolean;
  variant?: "assigned" | "unassigned";
  minimized?: boolean;
  onShiftClick: (shiftId: string) => void;
}

export function ShiftChip({
  schedule,
  hasConflict = false,
  employeeId = null,
  draggable = false,
  variant = "assigned",
  minimized = false,
  onShiftClick,
}: ShiftChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `shift-${schedule.id}`,
    disabled: !draggable,
    data: {
      type: "shift",
      shift: schedule,
      employeeId,
    },
  });

  const style =
    draggable && transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  const paint = shiftChipPaint(schedule.color, variant);
  const roleLabel = schedule.job_position?.name || schedule.role || "";

  return (
    <button
      type="button"
      ref={draggable ? setNodeRef : undefined}
      style={{
        ...style,
        backgroundColor: paint.backgroundColor,
        color: paint.color,
        borderLeft: paint.borderLeft,
      }}
      data-testid={`schedule-shift-${schedule.id}`}
      data-minimized={minimized ? "true" : "false"}
      data-opaque={paint.opaque ? "true" : "false"}
      className={cn(
        "relative z-20 w-full min-w-0 max-w-full overflow-hidden rounded-md border border-black/10 px-2.5 py-1.5 text-[11px] cursor-pointer hover:shadow-md transition-all duration-200 text-left shadow-sm",
        isDragging && "opacity-40",
        draggable && "touch-none",
      )}
      title={formatShiftWindow(schedule)}
      onClick={() => onShiftClick(schedule.id)}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      <div
        data-testid="shift-chip-title"
        className="font-medium truncate flex items-center gap-1"
      >
        {hasConflict ? (
          <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
        ) : null}
        {schedule.title ?? schedule.job_position?.name ?? "Shift"}
      </div>
      {minimized ? null : (
        <>
          {roleLabel ? (
            <div data-testid="shift-chip-role" className="truncate font-medium">
              {roleLabel}
            </div>
          ) : null}
          <div data-testid="shift-chip-time" className="text-xs opacity-75">
            {formatShiftWindow(schedule)}
          </div>
          <div data-testid="shift-chip-duration" className="text-[10px] opacity-80">
            {formatShiftDuration(schedule)}
            {schedule.required_headcount
              ? ` · ${schedule.required_headcount} req.`
              : ""}
          </div>
        </>
      )}
    </button>
  );
}

export function ShiftChipOverlay({
  schedule,
  hasConflict = false,
}: {
  schedule: ShiftWithAssignments;
  hasConflict?: boolean;
}) {
  const paint = shiftChipPaint(schedule.color, "assigned");
  return (
    <div
      className="rounded-md border border-black/10 px-2.5 py-1.5 text-[11px] shadow-lg cursor-grabbing"
      style={{
        backgroundColor: paint.backgroundColor,
        color: paint.color,
        borderLeft: paint.borderLeft,
      }}
    >
      <div className="font-medium truncate flex items-center gap-1">
        {hasConflict ? (
          <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
        ) : null}
        {schedule.title ?? schedule.job_position?.name ?? "Shift"}
      </div>
      {schedule.job_position?.name || schedule.role ? (
        <div className="truncate font-medium">
          {schedule.job_position?.name || schedule.role}
        </div>
      ) : null}
      <div className="text-xs opacity-75">{formatShiftWindow(schedule)}</div>
    </div>
  );
}
