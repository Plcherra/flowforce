/**
 * Task filters component
 */

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
import type { TaskStatusFilter, TaskPriorityFilter } from "../types/filters";
import { generatePriorityOptions } from "../utils/priorityOptions";

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: TaskPriorityFilter;
  onPriorityChange: (value: TaskPriorityFilter) => void;
  priorityOptions: Array<{ value: TaskPriorityFilter; label: string }>;
  filtersActive: boolean;
  onResetFilters: () => void;
}

export function TaskFilters({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  priorityOptions,
  filtersActive,
  onResetFilters,
}: TaskFiltersProps) {
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
              Search tasks
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="tasks-search"
              data-testid="tasks-search-input"
              placeholder="Search tasks"
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
            aria-label="Filter tasks by priority"
          >
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtersActive && (
        <Button variant="ghost" size="sm" onClick={onResetFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
