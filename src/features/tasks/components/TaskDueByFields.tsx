import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  shopLocalTimeDefault,
  shopTodayYmd,
} from "@/features/tasks/utils/taskDueTiming";

export type TaskDueByValue = {
  enabled: boolean;
  dateYmd: string;
  timeHm: string;
};

type TaskDueByFieldsProps = {
  idPrefix: string;
  value: TaskDueByValue;
  timeZone: string;
  onChange: (next: TaskDueByValue) => void;
  error?: string | null;
};

export function TaskDueByFields({
  idPrefix,
  value,
  timeZone,
  onChange,
  error,
}: TaskDueByFieldsProps) {
  const { t } = useTranslation();
  const switchId = `${idPrefix}-due-by`;
  const dateId = `${idPrefix}-due-date`;
  const timeId = `${idPrefix}-due-time`;

  const setEnabled = (enabled: boolean) => {
    if (enabled && !value.dateYmd) {
      onChange({
        enabled: true,
        dateYmd: shopTodayYmd(timeZone),
        timeHm: value.timeHm || shopLocalTimeDefault(timeZone),
      });
      return;
    }
    onChange({ ...value, enabled });
  };

  return (
    <div
      className="rounded-xl border border-border/80 bg-muted/20 p-4"
      data-testid={`${idPrefix}-due-by-section`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor={switchId}>{t("tasks.dueByToggle")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("tasks.dueByToggleHelp")}
          </p>
        </div>
        <Switch
          id={switchId}
          checked={value.enabled}
          onCheckedChange={(checked) => setEnabled(checked)}
          data-testid={`${idPrefix}-due-by-toggle`}
        />
      </div>
      {value.enabled ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={dateId}>{t("tasks.dueByDate")}</Label>
            <Input
              id={dateId}
              type="date"
              className="min-h-11 text-base"
              value={value.dateYmd}
              onChange={(event) =>
                onChange({ ...value, dateYmd: event.target.value })
              }
              data-testid={`${idPrefix}-due-by-date`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={timeId}>{t("tasks.dueByTime")}</Label>
            <Input
              id={timeId}
              type="time"
              className="min-h-11 text-base"
              value={value.timeHm}
              onChange={(event) =>
                onChange({ ...value, timeHm: event.target.value })
              }
              data-testid={`${idPrefix}-due-by-time`}
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}