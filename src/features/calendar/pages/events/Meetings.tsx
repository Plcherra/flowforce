import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Link } from "@/lib/router-adapter";

/** Meetings are created on the calendar. The /app/meetings route redirects there. */
export default function EventsMeetingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
      <CalendarDays className="h-8 w-8 text-primary" />
      <h1 className="text-xl font-semibold">{t("common.meetings")}</h1>
      <p className="text-sm text-muted-foreground">{t("calendar.meetingsLiveOnCalendar")}</p>
      <Link to="/app/calendar" className="text-sm font-medium text-primary">
        {t("common.calendar")}
      </Link>
    </div>
  );
}
