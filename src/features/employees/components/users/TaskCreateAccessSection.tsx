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

const KIND_LABELS: Record<TaskCreateKind, string> = {
  shift: "Shift",
  checklist: "Checklist",
  custom: "Custom",
};

const LEVELS: Array<{ value: TaskCreateLevel; label: string }> = [
  { value: "none", label: "None" },
  { value: "self", label: "For myself" },
  { value: "others", label: "For others" },
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
  return (
    <div className="space-y-3" data-testid="employee-task-create-access">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Tasks</h3>
        <p className="text-sm text-muted-foreground">
          For each type, this person can create for others, for themselves, or not at all.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {TASK_CREATE_KINDS.map((kind) => {
          const level = taskCreateLevelFromDiffs(classPermissions, diffs, kind);
          return (
            <div key={kind} className="space-y-1.5">
              <Label htmlFor={`task-create-${kind}`}>{KIND_LABELS[kind]}</Label>
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
                      {option.label}
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
