import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { shiftChipPaint } from "@/features/scheduling/utils/shiftChipPaint";
import { cn } from "@/lib/utils";

const EVENT_COLOR = "#0f766e";

export function CalendarEventBlock({
  event,
  selected = false,
  compact = false,
  onSelect,
}: {
  event: CalendarEvent;
  selected?: boolean;
  compact?: boolean;
  onSelect?: (eventId: string) => void;
}) {
  const { t } = useTranslation();
  const paint = shiftChipPaint(event.color || EVENT_COLOR, "assigned");
  const start = new Date(event.start);
  const when = Number.isNaN(start.getTime()) ? "" : format(start, "HH:mm");

  return (
    <button
      type="button"
      data-testid={`calendar-event-${event.id}`}
      data-opaque={paint.opaque ? "true" : "false"}
      className={cn(
        "mb-1 w-full rounded-md border border-black/10 text-left shadow-sm transition-shadow hover:shadow-md",
        compact ? "px-1.5 py-1 text-[10px]" : "p-2 text-xs",
        selected && "ring-2 ring-primary ring-offset-1",
      )}
      style={{
        backgroundColor: paint.backgroundColor,
        color: paint.color,
        borderLeft: paint.borderLeft,
      }}
      onClick={() => onSelect?.(event.id)}
    >
      <div className="truncate font-medium">{event.title || t("common.events")}</div>
      {when ? <div className="truncate text-[11px] opacity-90">{when}</div> : null}
    </button>
  );
}
