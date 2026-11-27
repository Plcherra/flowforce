import type { TFunction } from "i18next";
import { format } from "date-fns";
import { de, enUS, es, fr, it, pt } from "date-fns/locale";
import type { AppLanguage } from "@/i18n/resolveLanguage";
import {
  DEFAULT_SHOP_TIMEZONE,
  normalizeShopTimeZone,
  shopLocalPartsFromDueAt,
  type TaskDueShape,
} from "./taskDueTiming";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_FNS_LOCALE: Record<AppLanguage, Locale> = {
  en: enUS,
  es,
  pt,
  fr,
  it,
  de,
};

type Locale = (typeof enUS);

export function formatTaskDueLabel(
  task: TaskDueShape,
  t: TFunction,
  language: AppLanguage,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): string | null {
  const tz = normalizeShopTimeZone(timeZone);
  const locale = DATE_FNS_LOCALE[language] ?? enUS;

  if (task.due_at) {
    const instant = new Date(task.due_at);
    if (Number.isNaN(instant.getTime())) return null;
    const zoned = dayjs(instant).tz(tz);
    return t("tasks.dueByDisplay", {
      date: format(zoned.toDate(), "PP", { locale }),
      time: format(zoned.toDate(), "p", { locale }),
    });
  }

  if (task.due_date) {
    const date = new Date(`${task.due_date}T12:00:00`);
    return t("tasks.dueDateDisplay", {
      date: format(date, "PP", { locale }),
    });
  }

  return null;
}

export function readDueByFormState(
  task: TaskDueShape,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
): {
  enabled: boolean;
  dateYmd: string;
  timeHm: string;
} {
  const parts = shopLocalPartsFromDueAt(task.due_at, timeZone);
  if (parts) {
    return {
      enabled: true,
      dateYmd: parts.dateYmd,
      timeHm: parts.timeHm,
    };
  }
  return {
    enabled: false,
    dateYmd: "",
    timeHm: "",
  };
}