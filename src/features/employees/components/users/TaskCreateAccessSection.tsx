import { useTranslation } from "react-i18next";
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";
import {
  TASK_CREATE_KINDS,
  type TaskCreateKind,
} from "@/features/roles/constants/taskCreateKeys";
import { taskCreateLevelFromDiffs } from "@/features/tasks/utils/taskCreateAccess";
import type { TaskCreateLevel } from "@/features/tasks/utils/taskCreateLevel";

const KIND_KEYS: Record<TaskCreateKind, string> = {
  shift: "employees.taskKindShift",
  checklist: "employees.taskKindChecklist",
  custom: "common.custom",
};

const LEVELS: Array<{ value: TaskCreateLevel; labelKey: string }> = [
  { value: "none", labelKey: "employees.accessNone" },
  { value: "self", labelKey: "employees.forMyself" },
  { value: "others", labelKey: "employees.forOthers" },
];

interface TaskCreateAccessSectionProps {
  classPermissions: Record<string, boolean> | null | undefined;
  diffs: PermissionDiffMap;
  disabled: boolean;
  onChange: (kind: TaskCreateKind, level: TaskCreateLevel) => void;
}

export function TaskCreateAccessSection({
  classPermissions,
  diffs,
  disabled,
  onChange,
}: TaskCreateAccessSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3" data-testid="employee-task-create-access">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("common.tasks")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("employees.forEachTypeThisPersonCanCreateForOthersForThemselvesOrNotAtAll")}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {TASK_CREATE_KINDS.map((kind) => {
          const level = taskCreateLevelFromDiffs(classPermissions, diffs, kind);
          return (
            <div key={kind} className="space-y-1.5">
              <Label htmlFor={`task-create-${kind}`}>{t(KIND_KEYS[kind])}</Label>
              <Select
                value={level}
                onValueChange={(value) => onChange(kind, value as TaskCreateLevel)}
                disabled={disabled}
              >
                <SelectTrigger id={`task-create-${kind}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
