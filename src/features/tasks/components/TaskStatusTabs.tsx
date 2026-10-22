/**
 * Task status tabs component
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <Tabs
      value={statusFilter}
      onValueChange={(value) => onStatusChange(value as TaskStatusFilter)}
      className="w-full"
    >
      <div className="flex items-center gap-2 overflow-x-auto">
        <TabsList className="flex h-auto w-full min-w-max justify-start gap-1 bg-transparent p-0">
          {primary.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              title={statusDefinition(tab.value)}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-transparent px-3 py-1 data-[state=active]:border-border data-[state=active]:bg-background"
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
          ))}
        </TabsList>
        {more.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center rounded-full border border-input bg-background px-3 text-sm"
                data-testid="tasks-status-more"
              >
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {more.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  title={statusDefinition(tab.value)}
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
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </Tabs>
  );
}
