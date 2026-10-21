/**
 * Task status tabs component
 */

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TaskStatusFilter } from "../types/filters";
import {
  partitionStatusTabs,
  statusDefinition,
  type StatusTabItem,
} from "../utils/statusTabLayout";

interface TaskStatusTabsProps {
  statusFilter: TaskStatusFilter;
  onStatusChange: (value: TaskStatusFilter) => void;
  statusTabs: StatusTabItem[];
}

export function TaskStatusTabs({
  statusFilter,
  onStatusChange,
  statusTabs,
}: TaskStatusTabsProps) {
  const { primary, more } = partitionStatusTabs(statusTabs, statusFilter);

  return (
    <TooltipProvider delayDuration={200}>
      <Tabs
        value={statusFilter}
        onValueChange={(value) => onStatusChange(value as TaskStatusFilter)}
        className="w-full"
      >
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1">
          <TabsList className="flex w-full min-w-max gap-2">
            {primary.map((tab) => (
              <Tooltip key={tab.value}>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap"
                    data-testid={`tasks-status-${tab.value}`}
                  >
                    <span>{tab.label}</span>
                    <Badge
                      variant="outline"
                      className="border-transparent bg-muted px-2 py-0 text-xs font-medium"
                    >
                      {tab.count}
                    </Badge>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>{statusDefinition(tab.value)}</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
          {more.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center rounded-md border border-input bg-background px-3 text-sm font-medium"
                  data-testid="tasks-status-more"
                >
                  More
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {more.map((tab) => (
                  <Tooltip key={tab.value}>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onSelect={() => onStatusChange(tab.value)}
                        data-testid={`tasks-status-more-${tab.value}`}
                      >
                        <span className="flex w-full items-center justify-between gap-4">
                          <span>{tab.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {tab.count}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>{statusDefinition(tab.value)}</TooltipContent>
                  </Tooltip>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </Tabs>
    </TooltipProvider>
  );
}
