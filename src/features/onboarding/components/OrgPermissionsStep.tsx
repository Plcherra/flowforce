import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import {
  ORG_PERMISSION_KEYS,
  permissionValue,
  withRoleOverride,
  type OrgPermissionKey,
  type OrgPermissionMap,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";

const LABEL_KEYS: Record<OrgPermissionKey, string> = {
  "schedule.view": "onboarding.org.permSchedule",
  "schedule.create": "onboarding.org.permScheduleCreate",
  "schedule.edit": "onboarding.org.permScheduleEdit",
  "schedule.assign": "onboarding.org.permScheduleAssign",
  "schedule.delete": "onboarding.org.permScheduleDelete",
  "forms.submit": "onboarding.org.permForms",
  "tasks.view": "onboarding.org.permTasks",
  "tasks.update": "onboarding.org.permTasksUpdate",
};

export function OrgPermissionsStep({
  setup,
  onChange,
  embedded = false,
}: {
  setup: OrgSetup;
  onChange: (setup: OrgSetup) => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation();

  const setDepartmentPermission = (departmentId: string, key: OrgPermissionKey, value: boolean) => {
    onChange({
      ...setup,
      departments: setup.departments.map((item) =>
        item.id === departmentId
          ? { ...item, permissions: { ...item.permissions, [key]: value } }
          : item,
      ),
    });
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-6" data-testid="org-permissions">
      {embedded ? null : (
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{t("onboarding.org.permissionsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.org.permissionsHelp")}</p>
        </div>
      )}
      {setup.departments.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="org-permissions-empty">
          {t("onboarding.org.permissionsEmpty")}
        </p>
      ) : null}
      {setup.departments.map((department) => {
        const solo = department.solo && department.roles.length === 1;
        const primary = department.roles[0];
        return (
          <div key={department.id} className="space-y-3 rounded-xl border p-3">
            <h3 className="font-medium">{solo && primary ? primary.name : department.name}</h3>
            {solo && primary ? (
              <PermissionToggles
                prefix={`role-${primary.id}`}
                permissions={department.permissions}
                overrides={{}}
                onToggle={(key, value) => setDepartmentPermission(department.id, key, value)}
              />
            ) : (
              <>
                <PermissionToggles
                  prefix={`dept-${department.id}`}
                  permissions={department.permissions}
                  overrides={{}}
                  onToggle={(key, value) => setDepartmentPermission(department.id, key, value)}
                />
                {department.roles.map((entry) => (
                  <div key={entry.id} className="space-y-2 rounded-lg bg-muted/40 p-3">
                    <h4 className="text-sm font-medium">{entry.name}</h4>
                    <PermissionToggles
                      prefix={`role-${entry.id}`}
                      permissions={department.permissions}
                      overrides={entry.overrides}
                      onToggle={(key, value) =>
                        onChange({
                          ...setup,
                          departments: setup.departments.map((item) =>
                            item.id === department.id
                              ? {
                                  ...item,
                                  roles: item.roles.map((role) =>
                                    role.id === entry.id
                                      ? {
                                          ...role,
                                          overrides: withRoleOverride(
                                            role.overrides,
                                            item.permissions,
                                            key,
                                            value,
                                          ),
                                        }
                                      : role,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
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
  permissions: OrgPermissionMap;
  overrides: OrgPermissionMap;
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
