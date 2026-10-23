import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import type { ChecklistSlot } from "@/features/forms/utils/checklistForms";
import type { StoreStation } from "@/features/tasks/utils/shiftWeekdayTask";
import type { AssembledShift, MyShiftListView } from "@/features/tasks/utils/myShiftView";

const SLOT_KEYS: Record<ChecklistSlot, string> = {
  opening: "tasks.openingList",
  daily: "tasks.daily",
  closing: "tasks.closingList",
};

const STATION_KEYS: Record<StoreStation, string> = {
  front_of_house: "tasks.frontOfHouse",
  back_of_house: "tasks.backOfHouse",
};

interface MyShiftTasksProps {
  board: AssembledShift | { kind: "loading" } | { kind: "error" };
  onOpenList: (formId: string) => void;
}

export function MyShiftTasks({ board, onOpenList }: MyShiftTasksProps) {
  const { t } = useTranslation();

  if (board.kind === "loading") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-shift-loading">
        {t("tasks.loadingShift")}
      </p>
    );
  }
  if (board.kind === "error") {
    return (
      <p className="text-sm text-destructive" data-testid="my-shift-error">
        {t("tasks.unableToLoadShift")}
      </p>
    );
  }
  if (board.kind === "empty") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-shift-empty">
        {t("tasks.noShiftToday")}
      </p>
    );
  }
  if (board.kind === "unmapped") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-shift-unmapped">
        {t("tasks.shiftHasNoLists")}
      </p>
    );
  }

  const areaLabel =
    board.view.area === "cashier" ? t("tasks.areaCashier") : t("tasks.areaSupervisor");

  return (
    <section className="space-y-3" data-testid="my-shift-tasks">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{areaLabel}</h2>
        <p className="text-sm text-muted-foreground">{board.shiftTitle}</p>
      </div>
      {board.view.lists.map((list) => (
        <ShiftList key={list.slot} list={list} onOpenList={onOpenList} />
      ))}
      {board.view.weekdayTasks.length > 0 ? (
        <div
          className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
          data-testid="my-shift-weekday-tasks"
        >
          <h3 className="text-sm font-semibold">{t("tasks.weekdayTasks")}</h3>
          <ul className="space-y-2">
            {board.view.weekdayTasks.map((task) => (
              <li key={task.id} className="space-y-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.stations.map((station) => t(STATION_KEYS[station])).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ShiftList({
  list,
  onOpenList,
}: {
  list: MyShiftListView;
  onOpenList: (formId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
      data-testid={`my-shift-list-${list.slot}`}
    >
      <h3 className="text-sm font-semibold">{t(SLOT_KEYS[list.slot])}</h3>
      {list.notes.length > 0 ? (
        <div
          className="space-y-1 rounded-lg border border-border bg-muted/40 p-3"
          data-testid="my-shift-opening-notes"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("tasks.fromLastClose")}
          </p>
          {list.notes.map((note) => (
            <p key={note} className="text-sm">
              {note}
            </p>
          ))}
        </div>
      ) : null}
      {list.formId ? (
        <p className="text-sm">{list.title}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("tasks.noListAttached")}</p>
      )}
      {list.items.length > 0 ? (
        <ul className="space-y-1">
          {list.items.map((item) => (
            <li key={item.id} className="text-sm">
              {item.done ? `${t("tasks.markDone")} · ` : ""}
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={!list.formId}
        data-testid={`my-shift-open-${list.slot}`}
        onClick={() => {
          if (list.formId) onOpenList(list.formId);
        }}
      >
        {t("tasks.openList")}
      </Button>
    </div>
  );
}
