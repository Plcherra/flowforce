import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskSortKey } from "@/features/tasks/utils/taskListSort";

interface TaskSortControlProps {
  sort: TaskSortKey;
  onSortChange: (value: TaskSortKey) => void;
  className?: string;
}

const OPTIONS: TaskSortKey[] = ["due", "priority", "updated"];

export function TaskSortControl({
  sort,
  onSortChange,
  className = "",
}: TaskSortControlProps) {
  const { t } = useTranslation();
  const labelFor = (key: TaskSortKey) => {
    if (key === "priority") return t("tasks.sortByPriority");
    if (key === "updated") return t("tasks.sortByUpdated");
    return t("tasks.sortByDue");
  };

  return (
    <Select value={sort} onValueChange={(value) => onSortChange(value as TaskSortKey)}>
      <SelectTrigger
        className={className}
        data-testid="tasks-sort-filter"
        aria-label={t("tasks.sortBy")}
      >
        <SelectValue placeholder={t("tasks.sortBy")} />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((key) => (
          <SelectItem key={key} value={key} data-testid={`tasks-sort-${key}`}>
            {labelFor(key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}