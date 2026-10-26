import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { cn } from "@/lib/utils";
import { calendarEventHref } from "@/features/scheduling/utils/calendarEventHref";

export function DayEventNotice({
  count,
  date,
  eventId,
  className,
}: {
  count?: number;
  date?: string | null;
  eventId?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const label =
    typeof count === "number"
      ? t("schedule.dayEventCount", { count })
      : t("schedule.eventsLiveOnCalendar");

  return (
    <Link
      to={calendarEventHref({
        date,
        eventId: count === 1 ? eventId : null,
      })}
      data-testid="schedule-day-event-notice"
      title={t("schedule.dayEventCount", {
        count: typeof count === "number" ? count : 1,
      })}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/15",
        className,
      )}
    >
      <CalendarDays className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
