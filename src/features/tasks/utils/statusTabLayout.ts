import type { TaskStatusFilter } from "../types/filters";

export interface StatusTabItem {
  value: TaskStatusFilter;
  label: string;
  count: number;
}

export const STATUS_DEFINITIONS: Record<string, string> = {
  all: "Every task on this page.",
  todo: "Open work, including tasks that were started under the old flow.",
  done: "Finished. Includes tasks stored as done or completed.",
  completed: "Finished. Includes tasks stored as done or completed.",
  cancelled: "Stopped, and not expected to be finished.",
  other: "A status this page does not name.",
};

export function statusDefinition(value: string): string {
  return STATUS_DEFINITIONS[value] ?? STATUS_DEFINITIONS.other;
}

export function partitionStatusTabs<T extends StatusTabItem>(
  tabs: T[],
  selected: string,
): { primary: T[]; more: T[] } {
  const primary: T[] = [];
  const more: T[] = [];

  for (const tab of tabs) {
    const keepVisible =
      tab.value === "all" || tab.value === selected || tab.count > 0;
    if (keepVisible) primary.push(tab);
    else more.push(tab);
  }

  return { primary, more };
}
