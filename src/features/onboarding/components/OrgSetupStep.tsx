import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  coffeeShopStarter,
  emptyOrgSetup,
  newDepartment,
  newRole,
  type OrgDepartmentDraft,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";

export function OrgSetupStep({
  setup,
  onChange,
  showStartChoice = false,
  embedded = false,
}: {
  setup: OrgSetup;
  onChange: (setup: OrgSetup) => void;
  showStartChoice?: boolean;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const usingTemplate = setup.start !== "scratch";

  const updateDepartment = (id: string, patch: Partial<OrgDepartmentDraft>) => {
    onChange({
      ...setup,
      departments: setup.departments.map((department) =>
        department.id === id ? { ...department, ...patch } : department,
      ),
    });
  };

  const chooseStart = (start: "template" | "scratch") => {
    onChange(start === "template" ? coffeeShopStarter(t) : emptyOrgSetup());
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-6" data-testid="org-setup">
      {embedded ? null : (
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{t("onboarding.org.teamTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.org.teamHelp")}</p>
        </div>
      )}
      {showStartChoice ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={usingTemplate ? "default" : "outline"}
            className="min-h-11"
            aria-pressed={usingTemplate}
            data-testid="org-start-template"
            data-active={usingTemplate ? "true" : "false"}
            onClick={() => chooseStart("template")}
          >
            {t("onboarding.org.useTemplate")}
          </Button>
          <Button
            type="button"
            variant={usingTemplate ? "outline" : "default"}
            className="min-h-11"
            aria-pressed={!usingTemplate}
            data-testid="org-start-scratch"
            data-active={usingTemplate ? "false" : "true"}
            onClick={() => chooseStart("scratch")}
          >
            {t("onboarding.org.startScratch")}
          </Button>
        </div>
      ) : null}
      {setup.departments.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed p-4" data-testid="org-empty-departments">
          <p className="text-sm text-muted-foreground">{t("onboarding.org.emptyDepartments")}</p>
          <Button
            type="button"
            className="min-h-11"
            data-testid="org-add-department"
            onClick={() => onChange({ ...setup, departments: [...setup.departments, newDepartment()] })}
          >
            {t("onboarding.org.addDepartment")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {setup.departments.map((department) => (
            <div
              key={department.id}
              className="space-y-2 rounded-xl border p-3"
              data-testid={`org-department-${department.id}`}
            >
              {department.solo && department.roles.length === 1 ? (
                <div className="flex items-center gap-2">
                  <Input
                    className="min-h-11 font-medium"
                    aria-label={t("onboarding.org.roleName")}
                    data-testid={`org-role-${department.roles[0]!.id}`}
                    value={department.roles[0]!.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      updateDepartment(department.id, {
                        name,
                        roles: [{ ...department.roles[0]!, name }],
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 shrink-0"
                    data-testid={`org-remove-role-${department.roles[0]!.id}`}
                    onClick={() =>
                      onChange({
                        ...setup,
                        departments: setup.departments.filter((item) => item.id !== department.id),
                      })
                    }
                  >
                    {t("onboarding.org.removeRole")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      className="min-h-11 font-medium"
                      aria-label={t("onboarding.org.departmentName")}
                      value={department.name}
                      onChange={(event) => updateDepartment(department.id, { name: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 shrink-0"
                      data-testid={`org-remove-department-${department.id}`}
                      onClick={() =>
                        onChange({
                          ...setup,
                          departments: setup.departments.filter((item) => item.id !== department.id),
                        })
                      }
                    >
                      {t("onboarding.org.removeDepartment")}
                    </Button>
                  </div>
                  {department.roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="org-empty-roles">
                      {t("onboarding.org.emptyRoles")}
                    </p>
                  ) : (
                    <ul className="space-y-2 pl-3">
                      {department.roles.map((entry) => (
                        <li key={entry.id} className="flex items-center gap-2">
                          <Input
                            className="min-h-11"
                            aria-label={t("onboarding.org.roleName")}
                            data-testid={`org-role-${entry.id}`}
                            value={entry.name}
                            onChange={(event) =>
                              updateDepartment(department.id, {
                                roles: department.roles.map((item) =>
                                  item.id === entry.id ? { ...item, name: event.target.value } : item,
                                ),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-11 shrink-0"
                            data-testid={`org-remove-role-${entry.id}`}
                            onClick={() =>
                              updateDepartment(department.id, {
                                roles: department.roles.filter((item) => item.id !== entry.id),
                              })
                            }
                          >
                            {t("onboarding.org.removeRole")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                data-testid="org-add-role"
                onClick={() =>
                  updateDepartment(department.id, {
                    solo: false,
                    roles: [...department.roles, newRole(department.id)],
                  })
                }
              >
                {t("onboarding.org.addRole")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            data-testid="org-add-department"
            onClick={() => onChange({ ...setup, departments: [...setup.departments, newDepartment()] })}
          >
            {t("onboarding.org.addDepartment")}
          </Button>
        </div>
      )}
    </section>
  );
}
