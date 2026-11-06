import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/features/tasks/utils/taskSchedule";
import { type FormDistribution } from "@/features/forms/utils/formDistribution";

type Choice = { id: string; label: string };

const AUDIENCE_KINDS = [
  "company",
  "people",
  "position",
  "role",
  "department",
] as const;

export function FormDistributionEditor({
  distribution,
  roles,
  people,
  positions,
  departments,
  onChange,
}: {
  distribution: FormDistribution;
  roles: Choice[];
  people: Choice[];
  positions: Choice[];
  departments: Choice[];
  onChange: (distribution: FormDistribution) => void;
}) {
  const { t } = useTranslation();

  const setAudience = (
    key: "fillAudience" | "seeAudience",
    audience: TaskAudience,
  ) => {
    onChange({ ...distribution, [key]: audience });
  };

  const toggleRole = (roleId: string, checked: boolean) => {
    const next = new Set(distribution.roleIds);
    if (checked) next.add(roleId);
    else next.delete(roleId);
    onChange({ ...distribution, roleIds: [...next] });
  };

  return (
    <section className="space-y-3 pt-3" data-testid="form-distribution">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t("forms.distributionTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">{t("forms.distributionHelp")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="form-record-kind">{t("forms.recordKind")}</Label>
          <Select
            value={distribution.recordKind}
            onValueChange={(value) =>
              onChange({
                ...distribution,
                recordKind: value === "list" ? "list" : "form",
              })
            }
          >
            <SelectTrigger id="form-record-kind" data-testid="form-record-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="form">{t("forms.recordKindForm")}</SelectItem>
              <SelectItem value="list">{t("forms.recordKindList")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="form-show-from">{t("forms.showFrom")}</Label>
          <Input
            id="form-show-from"
            type="datetime-local"
            data-testid="form-show-from"
            value={toDatetimeLocalValue(distribution.showFrom)}
            onChange={(event) =>
              onChange({
                ...distribution,
                showFrom: fromDatetimeLocalValue(event.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground">{t("forms.showFromHelp")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="form-due-at">{t("forms.dueAt")}</Label>
          <Input
            id="form-due-at"
            type="datetime-local"
            data-testid="form-due-at"
            value={toDatetimeLocalValue(distribution.dueAt)}
            onChange={(event) =>
              onChange({
                ...distribution,
                dueAt: fromDatetimeLocalValue(event.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground">{t("forms.dueAtHelp")}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("forms.attachedRoles")}</Label>
        <p className="text-xs text-muted-foreground">{t("forms.attachedRolesHelp")}</p>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("forms.noCompanyRoles")}</p>
        ) : (
          <div
            className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-2"
            data-testid="form-attached-roles"
          >
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  data-testid={`form-attached-role-${role.id}`}
                  checked={distribution.roleIds.includes(role.id)}
                  onCheckedChange={(checked) => toggleRole(role.id, checked === true)}
                />
                <span>{role.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <AudienceControl
        id="form-fill-audience"
        label={t("forms.whoCanFill")}
        audience={distribution.fillAudience}
        people={people}
        positions={positions}
        roles={roles}
        departments={departments}
        onChange={(audience) => setAudience("fillAudience", audience)}
      />
      <AudienceControl
        id="form-see-audience"
        label={t("forms.whoCanSee")}
        audience={distribution.seeAudience}
        people={people}
        positions={positions}
        roles={roles}
        departments={departments}
        onChange={(audience) => setAudience("seeAudience", audience)}
      />
    </section>
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
  people: Choice[];
  positions: Choice[];
  roles: Choice[];
  departments: Choice[];
  onChange: (audience: TaskAudience) => void;
}) {
  const { t } = useTranslation();
  const kindLabel: Record<(typeof AUDIENCE_KINDS)[number], string> = {
    company: t("tasks.audienceCompany"),
    people: t("tasks.audiencePeople"),
    position: t("tasks.audiencePosition"),
    role: t("tasks.audienceRole"),
    department: t("tasks.audienceDepartment"),
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
        <SelectTrigger id={id} data-testid={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AUDIENCE_KINDS.map((kind) => (
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
                data-testid={`${id}-${option.id}`}
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
