import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emptyTaskAudience,
  type TaskAudience,
  type TaskAudienceKind,
} from "@/features/tasks/utils/taskAudience";

export type TaskAudienceOption = { id: string; label: string };

const KINDS: TaskAudienceKind[] = [
  "private",
  "people",
  "position",
  "role",
  "department",
  "company",
];

export function TaskAudienceFields({
  idPrefix,
  viewAudience,
  editAudience,
  people,
  positions,
  roles,
  departments,
  onViewChange,
  onEditChange,
}: {
  idPrefix: string;
  viewAudience: TaskAudience;
  editAudience: TaskAudience;
  people: TaskAudienceOption[];
  positions: TaskAudienceOption[];
  roles: TaskAudienceOption[];
  departments: TaskAudienceOption[];
  onViewChange: (audience: TaskAudience) => void;
  onEditChange: (audience: TaskAudience) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <AudienceControl
        id={`${idPrefix}-view`}
        label={t("tasks.whoCanView")}
        audience={viewAudience}
        people={people}
        positions={positions}
        roles={roles}
        departments={departments}
        onChange={onViewChange}
      />
      <AudienceControl
        id={`${idPrefix}-edit`}
        label={t("tasks.whoCanEdit")}
        audience={editAudience}
        people={people}
        positions={positions}
        roles={roles}
        departments={departments}
        onChange={onEditChange}
      />
    </div>
  );
}

function AudienceControl({
  id,
  label,
  audience,
  people,
  positions,
  roles,
  departments,
  onChange,
}: {
  id: string;
  label: string;
  audience: TaskAudience;
  people: TaskAudienceOption[];
  positions: TaskAudienceOption[];
  roles: TaskAudienceOption[];
  departments: TaskAudienceOption[];
  onChange: (audience: TaskAudience) => void;
}) {
  const { t } = useTranslation();
  const kindLabel: Record<TaskAudienceKind, string> = {
    private: t("tasks.audiencePrivate"),
    people: t("tasks.audiencePeople"),
    position: t("tasks.audiencePosition"),
    role: t("tasks.audienceRole"),
    department: t("tasks.audienceDepartment"),
    company: t("tasks.audienceCompany"),
  };
  const options =
    audience.kind === "people"
      ? people
      : audience.kind === "position"
        ? positions
        : audience.kind === "role"
          ? roles
          : audience.kind === "department"
            ? departments
            : [];
  const selected =
    audience.kind === "people"
      ? audience.userIds
      : audience.kind === "position"
        ? audience.positionIds
        : audience.kind === "role"
          ? audience.roleIds
          : audience.departmentIds;

  const toggle = (optionId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(optionId);
    else next.delete(optionId);
    const ids = [...next];
    if (audience.kind === "people") onChange({ ...audience, userIds: ids });
    if (audience.kind === "position") onChange({ ...audience, positionIds: ids });
    if (audience.kind === "role") onChange({ ...audience, roleIds: ids });
    if (audience.kind === "department") onChange({ ...audience, departmentIds: ids });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={audience.kind}
        onValueChange={(value) => onChange(emptyTaskAudience(value as TaskAudienceKind))}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {kindLabel[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {options.length > 0 ? (
        <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-2">
          {options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(option.id)}
                onCheckedChange={(checked) => toggle(option.id, checked === true)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
