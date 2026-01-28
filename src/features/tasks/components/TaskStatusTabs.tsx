/**
 * Task status tabs component
 */

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskStatusFilter } from "../types/filters";

interface StatusTab {
  value: TaskStatusFilter;
  label: string;
  count: number;
}

interface TaskStatusTabsProps {
  statusFilter: TaskStatusFilter;
  onStatusChange: (value: TaskStatusFilter) => void;
  statusTabs: StatusTab[];
}

export function TaskStatusTabs({
  statusFilter,
  onStatusChange,
  statusTabs,
}: TaskStatusTabsProps) {
  return (
    <Tabs
      value={statusFilter}
      onValueChange={(value) => onStatusChange(value as TaskStatusFilter)}
      className="w-full"
    >
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="flex w-full min-w-max gap-2">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 whitespace-nowrap"
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
      </div>
    </Tabs>
  );
}
