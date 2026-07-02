import { differenceInMinutes, format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type {
  ShiftWithAssignments,
  VendorEventWithMetadata,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";

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
  vendorEvents?: VendorEventWithMetadata[];
  getVendorLabel: (vendorType: string) => string;
  getVendorColor: (vendorType: string) => string;
  onShiftClick: (shiftId: string) => void;
}

export function ShiftChip({
  schedule,
  hasConflict = false,
  employeeId = null,
  draggable = false,
  variant = "assigned",
  vendorEvents = [],
  getVendorLabel,
  getVendorColor,
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

  const isAssigned = variant === "assigned";

  return (
    <button
      type="button"
      ref={draggable ? setNodeRef : undefined}
      style={{
        ...style,
        ...(isAssigned
          ? {
              backgroundColor: `${schedule.color ?? "#3b82f6"}15`,
              borderLeft: `3px solid ${schedule.color ?? "#3b82f6"}`,
            }
          : {}),
      }}
      data-testid={`schedule-shift-${schedule.id}`}
      className={cn(
        "relative z-20 rounded px-2 py-1 text-[11px] cursor-pointer hover:shadow-md transition-all duration-200 border text-left",
        isAssigned ? "bg-background" : "bg-background border-border shadow-sm",
        isDragging && "opacity-40",
        draggable && "touch-none",
      )}
      title={formatShiftWindow(schedule)}
      onClick={() => onShiftClick(schedule.id)}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      <div className="font-medium truncate flex items-center gap-1">
        {hasConflict ? (
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
        ) : null}
        {schedule.title ?? schedule.job_position?.name ?? "Shift"}
      </div>
      <div className="text-xs opacity-75">{formatShiftWindow(schedule)}</div>
      <div className="text-[10px] text-muted-foreground">
        {formatShiftDuration(schedule)}
        {schedule.required_headcount
          ? ` · ${schedule.required_headcount} req.`
          : ""}
      </div>
      {vendorEvents.map((event) => (
        <div
          key={`${event.id}-chip`}
          data-testid={`schedule-vendor-chip-${event.id}`}
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
  );
}

export function ShiftChipOverlay({
  schedule,
  hasConflict = false,
}: {
  schedule: ShiftWithAssignments;
  hasConflict?: boolean;
}) {
  return (
    <div
      className="rounded px-2 py-1 text-[11px] bg-background border shadow-lg cursor-grabbing"
      style={{
        backgroundColor: `${schedule.color ?? "#3b82f6"}15`,
        borderLeft: `3px solid ${schedule.color ?? "#3b82f6"}`,
      }}
    >
      <div className="font-medium truncate flex items-center gap-1">
        {hasConflict ? (
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
        ) : null}
        {schedule.title ?? schedule.job_position?.name ?? "Shift"}
      </div>
      <div className="text-xs opacity-75">{formatShiftWindow(schedule)}</div>
    </div>
  );
}
