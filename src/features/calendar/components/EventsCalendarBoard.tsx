import { format, isSameDay, isSameMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CalendarEventBlock } from "@/features/scheduling/components/CalendarEventBlock";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";
import {
  daysForCalendarView,
  eventOccursOnDay,
  formatCalendarHeading,
  stepCalendarDate,
  type CalendarBoardView,
} from "@/features/calendar/utils/calendarBoard";

interface EventsCalendarBoardProps {
  events: CalendarEvent[];
  loading: boolean;
  date: Date;
  view: CalendarBoardView;
  selectedEventId?: string | null;
  onDateChange: (next: Date) => void;
  onViewChange: (next: CalendarBoardView) => void;
  onSelectEvent: (eventId: string) => void;
}

const VIEWS: CalendarBoardView[] = ["day", "week", "month"];

function eventsOnDay(events: CalendarEvent[], day: Date) {
  return events
    .filter((event) => eventOccursOnDay(event, day))
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
}

export function EventsCalendarBoard({
  events,
  loading,
  date,
  view,
  selectedEventId,
  onDateChange,
  onViewChange,
  onSelectEvent,
}: EventsCalendarBoardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const days = daysForCalendarView(date, view);
  const heading = formatCalendarHeading(date, view, locale);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const visibleCount = days.reduce(
    (count, day) => count + eventsOnDay(events, day).length,
    0,
  );

  const openDay = (day: Date) => {
    onDateChange(day);
    onViewChange("day");
  };

  return (
    <div className="space-y-4" data-testid="calendar-board">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t("sections.prev")}
            data-testid="calendar-prev"
            onClick={() => onDateChange(stepCalendarDate(date, view, -1))}
          >
            {t("sections.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="calendar-today"
            onClick={() => onDateChange(new Date())}
          >
            {t("schedule.today")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t("common.next")}
            data-testid="calendar-next"
            onClick={() => onDateChange(stepCalendarDate(date, view, 1))}
          >
            {t("common.next")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <h2 className="text-lg font-semibold text-foreground" data-testid="calendar-heading">
            {heading}
          </h2>
          <div className="grid grid-cols-3 gap-1 sm:flex">
            {VIEWS.map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={view === mode ? "default" : "outline"}
                data-testid={`calendar-view-${mode}`}
                onClick={() => onViewChange(mode)}
              >
                {t(`schedule.${mode}`)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1">
          {days.slice(0, 7).map((day) => (
            <div
              key={`head-${format(day, "yyyy-MM-dd")}`}
              className="p-1 text-center text-[11px] font-medium text-muted-foreground sm:text-xs"
            >
              {weekday.format(day)}
            </div>
          ))}
          {days.map((day) => {
            const dayEvents = eventsOnDay(events, day);
            const shown = dayEvents.slice(0, 2);
            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                className={cn(
                  "min-h-[4.5rem] rounded-md border p-1 sm:min-h-[6.5rem]",
                  isSameMonth(day, date) ? "bg-background" : "bg-muted/40 text-muted-foreground",
                  isSameDay(day, new Date()) && "ring-1 ring-primary",
                )}
              >
                <button
                  type="button"
                  className="mb-1 text-xs font-semibold"
                  onClick={() => openDay(day)}
                >
                  {format(day, "d")}
                </button>
                <div className="space-y-1">
                  {shown.map((event) => (
                    <CalendarEventBlock
                      key={event.id}
                      event={event}
                      compact
                      selected={selectedEventId === event.id}
                      onSelect={onSelectEvent}
                    />
                  ))}
                  {dayEvents.length > shown.length ? (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground"
                      onClick={() => openDay(day)}
                    >
                      +{dayEvents.length - shown.length}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={view === "week" ? "grid grid-cols-1 gap-3 lg:grid-cols-7" : "space-y-2"}>
          {days.map((day) => {
            const dayEvents = eventsOnDay(events, day);
            return (
              <section
                key={format(day, "yyyy-MM-dd")}
                className={cn(
                  "rounded-md border p-2",
                  isSameDay(day, new Date()) && "ring-1 ring-primary",
                )}
              >
                <button
                  type="button"
                  className="mb-2 text-left text-xs font-semibold"
                  onClick={() => openDay(day)}
                >
                  <span className="block">{weekday.format(day)}</span>
                  <span className="text-sm">{format(day, "d")}</span>
                </button>
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <CalendarEventBlock
                      key={event.id}
                      event={event}
                      selected={selectedEventId === event.id}
                      onSelect={onSelectEvent}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("calendar.loadingEvents")}</p>
      ) : null}
      {!loading && visibleCount === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {t("calendar.noEventsThisView")}
        </p>
      ) : null}
    </div>
  );
}
