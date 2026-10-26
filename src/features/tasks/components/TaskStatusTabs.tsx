/**
 * Task status tabs component
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskStatusFilter } from "../types/filters";
import type { StatusTabItem } from "../utils/statusTabLayout";
import { translatedStatusHint, translatedStatusLabel } from "../utils/taskCopy";

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
  const { t } = useTranslation();
  return (
    <Tabs
      value={statusFilter}
      onValueChange={(value) => onStatusChange(value as TaskStatusFilter)}
      className="w-full"
    >
      <TabsList className="grid h-auto w-full grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1 bg-transparent p-0">
        {statusTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            title={translatedStatusHint(t, tab.value)}
            className="flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-2 py-1 text-sm data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-none"
            data-testid={`tasks-status-${tab.value}`}
          >
            <span>{translatedStatusLabel(t, tab.value, tab.label)}</span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {tab.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
