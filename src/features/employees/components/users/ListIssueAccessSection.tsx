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

const LEVELS: Array<{ value: ListIssueGrant; label: string }> = [
  { value: "none", label: "None" },
  { value: "read", label: "Read" },
  { value: "act", label: "Act" },
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
  const grant = listIssueGrantFromDiffs(classPermissions, diffs);

  return (
    <div className="space-y-1.5" data-testid="employee-list-issue-access">
      <Label htmlFor="list-issue-grant">List issues</Label>
      <p className="text-sm text-muted-foreground">
        None, read, or act on the issues gathered for the owner.
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
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
