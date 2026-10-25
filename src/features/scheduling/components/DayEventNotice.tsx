import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { cn } from "@/lib/utils";

export function DayEventNotice({
  count,
  className,
}: {
  count?: number;
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
      to="/app/calendar"
      data-testid="schedule-day-event-notice"
      title={t("schedule.eventsLiveOnCalendar")}
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
