import { useTranslation } from "react-i18next";
import { highlight } from "@/components/ui/highlight";
import React from "react";
import type {
  TaskPriorityFilter,
  TaskStatusFilter,
} from "@/features/tasks/types/filters";
import type { TaskKindFilter } from "@/features/tasks/utils/taskKind";
import type { ReadinessFilter } from "@/features/tasks/utils/readinessFilters";
import { translatedReadinessHint } from "@/features/tasks/utils/taskCopy";
import type { StatusTabItem } from "@/features/tasks/utils/statusTabLayout";
import type { TaskSortKey } from "@/features/tasks/utils/taskListSort";
import { TaskFilters } from "./TaskFilters";
import { TaskStatusTabs } from "./TaskStatusTabs";
import { TaskSortControl } from "./TaskSortControl";

interface TaskViewSectionProps {
  isMobile?: boolean;
  statusFilter: TaskStatusFilter;
  onStatusChange: (value: TaskStatusFilter) => void;
  statusTabs: StatusTabItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: TaskPriorityFilter;
  onPriorityChange: (value: TaskPriorityFilter) => void;
  priorityOptions: Array<{ value: TaskPriorityFilter; label: string }>;
  kindFilter: TaskKindFilter;
  onKindChange: (value: TaskKindFilter) => void;
  filtersActive: boolean;
  onResetFilters: () => void;
  readinessFilter: ReadinessFilter | null;
  onReadinessFilterChange: (value: ReadinessFilter | null) => void;
  readinessCounts: Record<ReadinessFilter, number>;
  sort: TaskSortKey;
  onSortChange: (value: TaskSortKey) => void;
}

const readinessItems: Array<{ key: ReadinessFilter; labelKey: string }> = [
  { key: "overdue", labelKey: "tasks.overdue" },
  { key: "unassigned", labelKey: "tasks.unassigned" },
  { key: "due", labelKey: "tasks.readinessDue" },
];

export function TaskViewSection({
  isMobile = false,
  statusFilter,
  onStatusChange,
  statusTabs,
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  priorityOptions,
  kindFilter,
  onKindChange,
  filtersActive,
  onResetFilters,
  readinessFilter,
  onReadinessFilterChange,
  readinessCounts,
  sort,
  onSortChange,
}: TaskViewSectionProps) {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("tasks.view")}
      data-testid="tasks-view-section"
      className={`space-y-2 rounded-xl border p-3 ${highlight.primary} ${isMobile ? "overflow-x-hidden" : ""}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{t("tasks.view")}</h2>
          {!isMobile ? (
            <p className="text-sm text-muted-foreground">
              {t("tasks.statusSearchTypePriorityAndTheReadinessCounts")}
            </p>
          ) : null}
        </div>
        <TaskSortControl
          sort={sort}
          onSortChange={onSortChange}
          className={isMobile ? "w-full" : "w-48"}
        />
      </div>

      <TaskStatusTabs
        isMobile={isMobile}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        statusTabs={statusTabs}
      />

      <TaskFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        priorityFilter={priorityFilter}
        onPriorityChange={onPriorityChange}
        priorityOptions={priorityOptions}
        kindFilter={kindFilter}
        onKindChange={onKindChange}
        filtersActive={filtersActive}
        onResetFilters={onResetFilters}
      />

      <div className="flex flex-wrap gap-2" data-testid="tasks-readiness-counts">
        {readinessItems.map((item) => {
          const pressed = readinessFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              title={translatedReadinessHint(t, item.key)}
              aria-pressed={pressed}
              data-testid={`tasks-readiness-${item.key}`}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                pressed
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/40"
              }`}
              onClick={() =>
                onReadinessFilterChange(pressed ? null : item.key)
              }
            >
              <span>{t(item.labelKey)}</span>
              <span className="text-xs font-medium tabular-nums">
                {readinessCounts[item.key]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
