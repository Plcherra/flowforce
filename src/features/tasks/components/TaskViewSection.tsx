import { useTranslation } from "react-i18next";
import React from "react";
import type {
  TaskPriorityFilter,
  TaskStatusFilter,
} from "@/features/tasks/types/filters";
import type { TaskKindFilter } from "@/features/tasks/utils/taskKind";
import {
  READINESS_DEFINITIONS,
  type ReadinessFilter,
} from "@/features/tasks/utils/readinessFilters";
import type { StatusTabItem } from "@/features/tasks/utils/statusTabLayout";
import { TaskFilters } from "./TaskFilters";
import { TaskStatusTabs } from "./TaskStatusTabs";

interface TaskViewSectionProps {
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
}

const readinessItems: Array<{ key: ReadinessFilter; label: string }> = [
  { key: "overdue", label: "Overdue" },
  { key: "unassigned", label: "Unassigned" },
  { key: "due", label: "Due" },
];

export function TaskViewSection({
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
}: TaskViewSectionProps) {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("tasks.view")}
      data-testid="tasks-view-section"
      className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{t("tasks.view")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("tasks.statusSearchTypePriorityAndTheReadinessCounts")}
        </p>
      </div>

      <TaskStatusTabs
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
              title={READINESS_DEFINITIONS[item.key]}
              aria-pressed={pressed}
              data-testid={`tasks-readiness-${item.key}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                pressed
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/40"
              }`}
              onClick={() =>
                onReadinessFilterChange(pressed ? null : item.key)
              }
            >
              <span>{item.label}</span>
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
