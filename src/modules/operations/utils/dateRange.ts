import { format } from "date-fns";
import type { DateRange } from "@/modules/operations/hooks/useIdeaInsights";

export function formatRangeAsPgDate(range: DateRange): string {
  const start = format(range.start, "yyyy-MM-dd");
  const end = format(range.end, "yyyy-MM-dd");
  return `[${start},${end})`;
}
