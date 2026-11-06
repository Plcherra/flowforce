import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/features/forms/components/form-utils";
import type { StoreStation } from "@/features/tasks/utils/shiftWeekdayTask";
import {
  shiftTaskMarkDoneAllowed,
  type AssembledShift,
  type MyShiftListView,
  type MyShiftShiftCard,
} from "@/features/tasks/utils/myShiftView";
import { formatTaskWindow } from "@/features/tasks/utils/taskSchedule";

const STATION_KEYS: Record<StoreStation, string> = {
  front_of_house: "tasks.frontOfHouse",
  back_of_house: "tasks.backOfHouse",
};

export type ScheduleAccess = "loading" | "allowed" | "denied";

interface MyShiftTasksProps {
  board: AssembledShift | { kind: "loading" } | { kind: "error" };
  onOpenList: (formId: string) => void;
  onToggleItem?: (formId: string, itemId: string, done: boolean) => void;
  onFillForm?: (formId: string) => void;
  onCompleteTask?: (taskId: string) => void;
  scheduleAccess?: ScheduleAccess;
  canFill?: boolean;
}

export function MyShiftTasks({
  board,
  onOpenList,
  onToggleItem,
  onFillForm,
  onCompleteTask,
  scheduleAccess = "allowed",
  canFill = true,
}: MyShiftTasksProps) {
  const { t } = useTranslation();

  if (scheduleAccess === "loading" || board.kind === "loading") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-shift-loading">
        {t("tasks.loadingShift")}
      </p>
    );
  }
  if (scheduleAccess === "denied") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-shift-schedule-denied">
        {t("tasks.cannotViewOwnSchedule")}
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
    board.view.area === "cashier"
      ? t("tasks.areaCashier")
      : board.view.area === "supervisor"
        ? t("tasks.areaSupervisor")
        : null;

  return (
    <section className="space-y-3" data-testid="my-shift-tasks">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{areaLabel ?? board.shiftTitle}</h2>
        {areaLabel ? (
          <p className="text-sm text-muted-foreground">{board.shiftTitle}</p>
        ) : null}
      </div>
      {board.view.shiftTasks.map((task) => (
        <ShiftTaskCard
          key={task.id}
          task={task}
          onFillForm={onFillForm}
          onCompleteTask={onCompleteTask}
        />
      ))}
      {board.view.lists.map((list) => (
        <ShiftList
          key={list.formId}
          list={list}
          canFill={canFill}
          onOpenList={onOpenList}
          onToggleItem={onToggleItem}
        />
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
  canFill,
  onOpenList,
  onToggleItem,
}: {
  list: MyShiftListView;
  canFill: boolean;
  onOpenList: (formId: string) => void;
  onToggleItem?: (formId: string, itemId: string, done: boolean) => void;
}) {
  const { t } = useTranslation();
  const due = formatDateTime(list.dueAt);
  const from = formatDateTime(list.showFrom);
  return (
    <div
      className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
      data-testid={`my-shift-list-${list.formId}`}
    >
      <h3 className="text-sm font-semibold">{list.title}</h3>
      {from ? (
        <p className="text-xs text-muted-foreground" data-testid={`my-shift-window-${list.formId}`}>
          {t("tasks.showFromAt", { time: from })}
        </p>
      ) : null}
      {due ? (
        <p className="text-xs text-muted-foreground" data-testid={`my-shift-due-${list.formId}`}>
          {t("tasks.listDueAt", { time: due })}
        </p>
      ) : null}
      {list.items.length > 0 ? (
        <ul className="space-y-1">
          {list.items.map((item) => (
            <li key={item.id}>
              {canFill ? (
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <Checkbox
                    checked={item.done}
                    data-testid={`my-shift-item-${item.id}`}
                    onCheckedChange={(value) => {
                      if (!onToggleItem) return;
                      onToggleItem(list.formId, item.id, value === true);
                    }}
                  />
                  <span>{item.label}</span>
                </label>
              ) : (
                <p className="text-sm" data-testid={`my-shift-item-readonly-${item.id}`}>
                  {item.label}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {canFill ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          data-testid={`my-shift-open-${list.formId}`}
          onClick={() => onOpenList(list.formId)}
        >
          {t("tasks.openList")}
        </Button>
      ) : null}
    </div>
  );
}

function ShiftTaskCard({
  task,
  onFillForm,
  onCompleteTask,
}: {
  task: MyShiftShiftCard;
  onFillForm?: (formId: string) => void;
  onCompleteTask?: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const windowLabel = formatTaskWindow(task.startsAt, task.endsAt);
  const cancelled = task.status === "cancelled";
  const canMarkDone = shiftTaskMarkDoneAllowed(task.status);
  return (
    <article
      className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
      data-testid={`my-shift-task-${task.id}`}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{task.title}</h3>
        {task.description ? (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t("people.selectedCount", { count: task.assigneeCount })}
          {windowLabel ? " " + t("literals.text34", { windowLabel: windowLabel }) : ""}
        </p>
      </div>
      {canMarkDone ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          data-testid={`my-shift-task-done-${task.id}`}
          onClick={() => onCompleteTask?.(task.id)}
        >
          {t("tasks.markDone")}
        </Button>
      ) : (
        <p
          className="text-sm text-muted-foreground"
          data-testid={`my-shift-task-closed-${task.id}`}
        >
          {cancelled ? t("tasks.statusCancelled") : t("tasks.statusDone")}
        </p>
      )}
      {task.formId ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          data-testid={`my-shift-task-fill-${task.id}`}
          onClick={() => onFillForm?.(task.formId ?? "")}
        >
          {t("tasks.fillAndSend")}
        </Button>
      ) : null}
    </article>
  );
}
