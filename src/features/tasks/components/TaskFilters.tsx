/**
 * Task filters component
 */

import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TaskPriorityFilter } from "../types/filters";
import type { TaskKindFilter } from "../utils/taskKind";
import { translatedKindLabel, translatedPriorityLabel } from "../utils/taskCopy";

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: TaskPriorityFilter;
  onPriorityChange: (value: TaskPriorityFilter) => void;
  priorityOptions: Array<{ value: TaskPriorityFilter; label: string }>;
  kindFilter: TaskKindFilter;
  onKindChange: (value: TaskKindFilter) => void;
  filtersActive: boolean;
  onResetFilters: () => void;
}

export function TaskFilters({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  priorityOptions,
  kindFilter,
  onKindChange,
  filtersActive,
  onResetFilters,
}: TaskFiltersProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div
      className={
        isMobile
          ? "space-y-3"
          : "flex flex-wrap items-center justify-between gap-4"
      }
    >
      <div className={isMobile ? "space-y-3" : "flex items-center gap-3"}>
        <div className={isMobile ? "w-full" : "w-64"}>
          <div className="relative">
            <Label htmlFor="tasks-search" className="sr-only">
              {t("tasks.searchTasks")}
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="tasks-search"
              data-testid="tasks-search-input"
              placeholder={t("tasks.searchTasks")}
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select
          value={priorityFilter}
          onValueChange={(value) =>
            onPriorityChange(value as TaskPriorityFilter)
          }
        >
          <SelectTrigger
            className={isMobile ? "w-full" : "w-48"}
            data-testid="tasks-priority-filter"
            aria-label={t("tasks.filterTasksByPriority")}
          >
            <SelectValue placeholder={t("tasks.filterByPriority")} />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {translatedPriorityLabel(t, option.value, option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={kindFilter}
          onValueChange={(value) => onKindChange(value as TaskKindFilter)}
        >
          <SelectTrigger
            className={isMobile ? "w-full" : "w-44"}
            data-testid="tasks-kind-filter"
            aria-label={t("tasks.filterTasksByType")}
          >
            <SelectValue placeholder={t("tasks.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tasks.allTypes")}</SelectItem>
            <SelectItem value="shift">{translatedKindLabel(t, "shift")}</SelectItem>
            <SelectItem value="checklist">{translatedKindLabel(t, "checklist")}</SelectItem>
            <SelectItem value="custom">{translatedKindLabel(t, "custom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtersActive && (
        <Button variant="ghost" size="sm" className="min-h-11" onClick={onResetFilters}>
          {t("tasks.clearFilters")}
        </Button>
      )}
    </div>
  );
}
