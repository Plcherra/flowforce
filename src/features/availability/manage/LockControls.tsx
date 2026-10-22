import dayjs from "dayjs";
import { Clock, Loader2, Lock } from "lucide-react";

import type { AvailabilityLockMode } from "@/types/availability";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DayOption, HourOption, LockStatePreview } from "./types";
import { useTranslation } from "react-i18next";

interface LockControlsProps {
  mode: AvailabilityLockMode;
  day: string;
  hour: string;
  onModeChange: (mode: AvailabilityLockMode) => void;
  onDayChange: (value: string) => void;
  onHourChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  dayOptions: DayOption[];
  hourOptions: HourOption[];
  lockStatePreview: LockStatePreview | null;
}

export function LockControls({
  mode,
  day,
  hour,
  onModeChange,
  onDayChange,
  onHourChange,
  onSave,
  saving,
  dayOptions,
  hourOptions,
  lockStatePreview,
}: LockControlsProps) {
  const { t } = useTranslation();
  return (
    <Card className="border bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-primary" />{t("availability.lockControls")}</CardTitle>
        <CardDescription>{t("availability.configureHowAndWhenEmployeesCanAdjustTheir")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground">{t("availability.mode")}</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) =>
              onModeChange(value as AvailabilityLockMode)
            }
            className="grid gap-3 md:grid-cols-3"
          >
            <ModeOption
              value="open"
              title={t("schedule.open")}
              description="Employees can edit availability anytime."
            />
            <ModeOption
              value="auto"
              title={t("availability.auto")}
              description="Lock automatically before each week."
            />
            <ModeOption
              value="lock"
              title={t("availability.lock")}
              description="Only managers can approve changes."
            />
          </RadioGroup>
        </div>

        {mode === "auto" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("availability.lockDay")}</Label>
              <Select value={day} onValueChange={onDayChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("availability.selectDay")} />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("availability.lockHour")}</Label>
              <Select value={hour} onValueChange={onHourChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("availability.selectHour")} />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary">
              {lockStatePreview?.nextLock ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Next lock (based on current settings):{" "}
                  {dayjsFormatted(lockStatePreview.nextLock)}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-primary/80">
                  <Clock className="h-4 w-4" />{t("availability.autoLockingPreviewUpdatesAfterSavingNewSettings")}</div>
              )}
            </div>
          </div>
        )}

        {mode !== "auto" && (
          <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{t("availability.automaticLocksAreDisabledEmployeesKeepTheirCurrent")}</div>
        )}

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeOption({
  value,
  title,
  description,
}: {
  value: AvailabilityLockMode;
  title: string;
  description: string;
}) {
  return (
    <Label
      htmlFor={`lock-${value}`}
      className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm transition hover:border-primary"
    >
      <RadioGroupItem value={value} id={`lock-${value}`} className="sr-only" />
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Label>
  );
}

function dayjsFormatted(date: string) {
  return dayjs(date).format("ddd, MMM D h:mm A");
}
