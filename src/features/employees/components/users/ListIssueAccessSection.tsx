import { useTranslation } from "react-i18next";
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
  listIssueGrantFromDiffs,
  type ListIssueGrant,
} from "@/features/tasks/utils/listIssueGather";

const LEVELS: Array<{ value: ListIssueGrant; labelKey: string }> = [
  { value: "none", labelKey: "employees.accessNone" },
  { value: "read", labelKey: "employees.accessRead" },
  { value: "act", labelKey: "employees.accessAct" },
];

export function ListIssueAccessSection({
  classPermissions,
  diffs,
  disabled,
  onChange,
}: {
  classPermissions: Record<string, boolean> | null | undefined;
  diffs: PermissionDiffMap;
  disabled: boolean;
  onChange: (grant: ListIssueGrant) => void;
}) {
  const { t } = useTranslation();
  const grant = listIssueGrantFromDiffs(classPermissions, diffs);

  return (
    <div className="space-y-1.5" data-testid="employee-list-issue-access">
      <Label htmlFor="list-issue-grant">{t("tasks.listIssues")}</Label>
      <p className="text-sm text-muted-foreground">
        {t("employees.noneReadOrActOnTheIssuesGatheredForTheOwner")}
      </p>
      <Select
        value={grant}
        onValueChange={(value) => onChange(value as ListIssueGrant)}
        disabled={disabled}
      >
        <SelectTrigger id="list-issue-grant">
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
}
