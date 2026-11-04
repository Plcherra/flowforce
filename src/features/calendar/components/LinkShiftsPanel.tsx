import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useShiftsForDate } from "@/hooks/useShiftsForDate";
import { useTranslation } from "react-i18next";

interface LinkShiftsPanelProps {
  eventDate: string;
  storeId?: string | null;
  linkedShiftIds: string[];
  onChange: (next: string[]) => Promise<void>;
  disabled?: boolean;
  busy?: boolean;
}

const timeRange = (startIso: string, endIso: string) => {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "";
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
};

export function LinkShiftsPanel({
  eventDate,
  storeId,
  linkedShiftIds,
  onChange,
  disabled = false,
  busy = false,
}: LinkShiftsPanelProps) {
  const { t } = useTranslation();
  const { shifts, staff, loading } = useShiftsForDate(eventDate, storeId);

  const linkedSet = useMemo(() => new Set(linkedShiftIds), [linkedShiftIds]);

  const toggle = async (shiftId: string) => {
    if (disabled || busy) return;
    const next = new Set(linkedSet);
    if (next.has(shiftId)) next.delete(shiftId);
    else next.add(shiftId);
    await onChange(Array.from(next));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("calendar.shiftsOnThisDay")}</h3>
        <Badge variant="outline" className="text-[11px]">
          {t("calendar.onDutyCount", { count: staff.length })}
        </Badge>
      </div>

      {loading && (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{t("calendar.loadingShifts")}</div>
      )}

      {!loading && shifts.length === 0 && (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{t("calendar.noScheduledShiftsMatchThisDate")}</div>
      )}

      <div className="space-y-2">
        {shifts.map((shift) => {
          const checked = linkedSet.has(shift.id);
          return (
            <label
              key={shift.id}
              className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 text-sm"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(shift.id)}
                  disabled={disabled || busy}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    {shift.title || shift.job_position?.name || t("calendar.shiftFallback")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeRange(shift.start_time, shift.end_time)}
                  </p>
                  {shift.location && (
                    <p className="text-xs text-muted-foreground">
                      Location: {shift.location}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{shift.assignments?.length ?? 0} assigned</p>
                {checked && <span className="text-primary">{t("calendar.linked")}</span>}
              </div>
            </label>
          );
        })}
      </div>

      {busy && (
        <div className="text-xs text-muted-foreground">{t("calendar.savingChanges")}</div>
      )}
    </div>
  );
}
