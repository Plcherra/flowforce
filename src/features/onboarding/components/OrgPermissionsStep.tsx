import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import {
  ORG_PERMISSION_KEYS,
  permissionValue,
  withRoleOverride,
  type OrgPermissionKey,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";

const LABEL_KEYS: Record<OrgPermissionKey, string> = {
  "schedule.view": "onboarding.org.permSchedule",
  "schedule.edit": "onboarding.org.permScheduleEdit",
  "forms.submit": "onboarding.org.permForms",
  "tasks.view": "onboarding.org.permTasks",
  "tasks.update": "onboarding.org.permTasksUpdate",
};

export function OrgPermissionsStep({
  setup,
  onChange,
}: {
  setup: OrgSetup;
  onChange: (setup: OrgSetup) => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="mx-auto w-full max-w-xl space-y-6" data-testid="org-permissions">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">{t("onboarding.org.permissionsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("onboarding.org.permissionsHelp")}</p>
      </div>
      {setup.departments.map((department) => (
        <div key={department.id} className="space-y-3 rounded-xl border p-3">
          <h3 className="font-medium">{department.name}</h3>
          <PermissionToggles
            prefix={`dept-${department.id}`}
            permissions={department.permissions}
            overrides={{}}
            onToggle={(key, value) =>
              onChange({
                ...setup,
                departments: setup.departments.map((item) =>
                  item.id === department.id
                    ? { ...item, permissions: { ...item.permissions, [key]: value } }
                    : item,
                ),
              })
            }
          />
          {department.roles.map((role) => (
            <div key={role.id} className="space-y-2 rounded-lg bg-muted/40 p-3">
              <h4 className="text-sm font-medium">{role.name}</h4>
              <PermissionToggles
                prefix={`role-${role.id}`}
                permissions={department.permissions}
                overrides={role.overrides}
                onToggle={(key, value) =>
                  onChange({
                    ...setup,
                    departments: setup.departments.map((item) =>
                      item.id === department.id
                        ? {
                            ...item,
                            roles: item.roles.map((entry) =>
                              entry.id === role.id
                                ? {
                                    ...entry,
                                    overrides: withRoleOverride(
                                      entry.overrides,
                                      item.permissions,
                                      key,
                                      value,
                                    ),
                                  }
                                : entry,
                            ),
                          }
                        : item,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function PermissionToggles({
  prefix,
  permissions,
  overrides,
  onToggle,
}: {
  prefix: string;
  permissions: OrgSetup["departments"][number]["permissions"];
  overrides: OrgSetup["departments"][number]["roles"][number]["overrides"];
  onToggle: (key: OrgPermissionKey, value: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-2">
      {ORG_PERMISSION_KEYS.map((key) => (
        <li key={key} className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm">{t(LABEL_KEYS[key])}</span>
          <Switch
            checked={permissionValue(permissions, overrides, key)}
            data-testid={`${prefix}-${key}`}
            aria-label={t(LABEL_KEYS[key])}
            onCheckedChange={(checked) => onToggle(key, checked)}
          />
        </li>
      ))}
    </ul>
  );
}
