import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTasks } from "@/hooks/useTasks";
import type { ChecklistArea } from "@/features/forms/utils/checklistForms";
import type { StoreStation, Weekday } from "@/features/tasks/utils/shiftWeekdayTask";
import { weekdayTaskInsert, weekdayTaskRecord } from "@/features/tasks/utils/weekdayTaskDraft";
import { WeekdayTaskForm } from "./WeekdayTaskForm";

export function WeekdayTaskSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createTask } = useTasks();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<ChecklistArea>("supervisor");
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [stations, setStations] = useState<StoreStation[]>([]);

  const toggle = <T extends string>(values: T[], value: T, set: (next: T[]) => void) => {
    set(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const save = async () => {
    const task = weekdayTaskRecord({ title, area, weekdays, stations });
    if (!task || !user?.id) {
      toast({ title: t("tasks.pickWeekdayAndStation"), variant: "destructive" });
      return;
    }
    const { error } = await createTask(weekdayTaskInsert(task, user.id));
    if (error) {
      toast({ title: t("tasks.unableToSaveWeekdayTask"), variant: "destructive" });
      return;
    }
    setTitle("");
    setWeekdays([]);
    setStations([]);
    toast({ title: t("tasks.weekdayTaskSaved") });
  };

  return (
    <WeekdayTaskForm
      title={title}
      area={area}
      weekdays={weekdays}
      stations={stations}
      onTitle={setTitle}
      onArea={setArea}
      onToggleWeekday={(day) => toggle(weekdays, day, setWeekdays)}
      onToggleStation={(station) => toggle(stations, station, setStations)}
      onSave={() => {
        void save();
      }}
    />
  );
}
