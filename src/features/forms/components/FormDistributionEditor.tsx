import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { parseClock } from "@/features/forms/utils/formDayWindow";
import { type FormDistribution } from "@/features/forms/utils/formDistribution";

type Choice = { id: string; label: string };

const AUDIENCE_KINDS = [
  "company",
  "people",
  "position",
  "role",
  "department",
] as const;

const SHOW_DEFAULT = "06:00";
const DUE_DEFAULT = "08:00";
const COMPLETE_DEFAULT = "09:00";

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

  const setClock = (
    key: "showAt" | "dueTime" | "completeBy",
    value: string | null,
  ) => {
    onChange({ ...distribution, timeMode: "shift_day", [key]: value });
  };

  return (
    <section className="space-y-5" data-testid="form-distribution">
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
          <SelectTrigger id="form-record-kind" className="min-h-11" data-testid="form-record-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="form">{t("forms.recordKindForm")}</SelectItem>
            <SelectItem value="list">{t("forms.recordKindList")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("forms.attachedRoles")}</Label>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("forms.noCompanyRoles")}</p>
        ) : (
          <div
            className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2"
            data-testid="form-attached-roles"
          >
            {roles.map((role) => (
              <label key={role.id} className="flex min-h-11 items-center gap-2 text-sm">
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
      <div className="space-y-2">
        <TimeToggle
          id="form-show-time"
          label={t("forms.showTime")}
          value={distribution.showAt}
          fallback={SHOW_DEFAULT}
          onChange={(value) => setClock("showAt", value)}
        />
        <TimeToggle
          id="form-due-time"
          label={t("forms.dueTime")}
          value={distribution.dueTime}
          fallback={DUE_DEFAULT}
          onChange={(value) => setClock("dueTime", value)}
        />
        <TimeToggle
          id="form-complete-time"
          label={t("forms.completeByTime")}
          value={distribution.completeBy}
          fallback={COMPLETE_DEFAULT}
          onChange={(value) => setClock("completeBy", value)}
        />
      </div>
    </section>
  );
}

function TimeToggle({
  id,
  label,
  value,
  fallback,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  fallback: string;
  onChange: (value: string | null) => void;
}) {
  const on = value != null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${id}-toggle`}>{label}</Label>
        <Switch
          id={`${id}-toggle`}
          checked={on}
          data-testid={`${id}-toggle`}
          onCheckedChange={(checked) => onChange(checked ? (value ?? fallback) : null)}
          aria-label={label}
        />
      </div>
      {on ? (
        <Input
          type="time"
          className="min-h-11 sm:max-w-[10rem]"
          data-testid={id}
          value={value ?? ""}
          aria-label={label}
          onChange={(event) => onChange(parseClock(event.target.value) ?? fallback)}
        />
      ) : null}
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
        <SelectTrigger id={id} className="min-h-11" data-testid={id}>
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
            <label key={option.id} className="flex min-h-11 items-center gap-2 text-sm">
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
