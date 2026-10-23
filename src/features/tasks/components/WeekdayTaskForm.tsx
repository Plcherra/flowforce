import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChecklistArea } from "@/features/forms/utils/checklistForms";
import { WEEKDAYS, type StoreStation, type Weekday } from "@/features/tasks/utils/shiftWeekdayTask";

const WEEKDAY_KEYS: Record<Weekday, string> = {
  mon: "tasks.weekdayMon",
  tue: "tasks.weekdayTue",
  wed: "tasks.weekdayWed",
  thu: "tasks.weekdayThu",
  fri: "tasks.weekdayFri",
  sat: "tasks.weekdaySat",
  sun: "tasks.weekdaySun",
};

interface WeekdayTaskFormProps {
  title: string;
  area: ChecklistArea;
  weekdays: readonly Weekday[];
  stations: readonly StoreStation[];
  onTitle: (value: string) => void;
  onArea: (value: ChecklistArea) => void;
  onToggleWeekday: (day: Weekday) => void;
  onToggleStation: (station: StoreStation) => void;
  onSave: () => void;
}

export function WeekdayTaskForm({
  title,
  area,
  weekdays,
  stations,
  onTitle,
  onArea,
  onToggleWeekday,
  onToggleStation,
  onSave,
}: WeekdayTaskFormProps) {
  const { t } = useTranslation();
  const canSave = title.trim().length > 0 && weekdays.length > 0 && stations.length > 0;
  return (
    <section className="space-y-3" data-testid="weekday-task-setup">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("tasks.weekdayTask")}</h2>
        <p className="text-sm text-muted-foreground">{t("tasks.weekdayTaskHelp")}</p>
      </div>
      <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
        <Label htmlFor="weekday-task-title">{t("tasks.taskTitle")}</Label>
        <Input
          id="weekday-task-title"
          className="min-h-11"
          value={title}
          onChange={(event) => onTitle(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={area === "cashier" ? "default" : "outline"}
            className="min-h-11"
            onClick={() => onArea("cashier")}
          >
            {t("tasks.areaCashier")}
          </Button>
          <Button
            type="button"
            variant={area === "supervisor" ? "default" : "outline"}
            className="min-h-11"
            onClick={() => onArea("supervisor")}
          >
            {t("tasks.areaSupervisor")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <Button
              key={day}
              type="button"
              variant={weekdays.includes(day) ? "default" : "outline"}
              className="min-h-11"
              data-testid={`weekday-${day}`}
              aria-pressed={weekdays.includes(day)}
              onClick={() => onToggleWeekday(day)}
            >
              {t(WEEKDAY_KEYS[day])}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant={stations.includes("front_of_house") ? "default" : "outline"}
            className="min-h-11"
            data-testid="station-front_of_house"
            aria-pressed={stations.includes("front_of_house")}
            onClick={() => onToggleStation("front_of_house")}
          >
            {t("tasks.frontOfHouse")}
          </Button>
          <Button
            type="button"
            variant={stations.includes("back_of_house") ? "default" : "outline"}
            className="min-h-11"
            data-testid="station-back_of_house"
            aria-pressed={stations.includes("back_of_house")}
            onClick={() => onToggleStation("back_of_house")}
          >
            {t("tasks.backOfHouse")}
          </Button>
        </div>
        <Button type="button" className="min-h-11 w-full" disabled={!canSave} onClick={onSave}>
          {t("tasks.saveWeekdayTask")}
        </Button>
      </div>
    </section>
  );
}
