import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ORG_BUSINESS_TYPES,
  type OrgBusinessType,
  type OrgDepartmentDraft,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";

const TYPE_KEYS: Record<OrgBusinessType, string> = {
  cafe: "onboarding.org.cafe",
  restaurant: "onboarding.org.restaurant",
  retail: "onboarding.org.retail",
};

export function OrgSetupStep({
  setup,
  onType,
  onChange,
}: {
  setup: OrgSetup;
  onType: (type: OrgBusinessType) => void;
  onChange: (setup: OrgSetup) => void;
}) {
  const { t } = useTranslation();

  const updateDepartment = (id: string, patch: Partial<OrgDepartmentDraft>) => {
    onChange({
      ...setup,
      departments: setup.departments.map((department) =>
        department.id === id ? { ...department, ...patch } : department,
      ),
    });
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-6" data-testid="org-setup">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">{t("onboarding.org.teamTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("onboarding.org.teamHelp")}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ORG_BUSINESS_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant={setup.businessType === type ? "default" : "outline"}
            className="min-h-11"
            data-testid={`org-business-${type}`}
            onClick={() => onType(type)}
          >
            {t(TYPE_KEYS[type])}
          </Button>
        ))}
      </div>
      <div className="space-y-4">
        {setup.departments.map((department) => (
          <div key={department.id} className="space-y-2 rounded-xl border p-3" data-testid={`org-department-${department.id}`}>
            <Input
              className="min-h-11 font-medium"
              aria-label={t("onboarding.org.departmentName")}
              value={department.name}
              onChange={(event) => updateDepartment(department.id, { name: event.target.value })}
            />
            <ul className="space-y-2 pl-3">
              {department.roles.map((role) => (
                <li key={role.id}>
                  <Input
                    className="min-h-11"
                    aria-label={t("onboarding.org.roleName")}
                    data-testid={`org-role-${role.id}`}
                    value={role.name}
                    onChange={(event) =>
                      updateDepartment(department.id, {
                        roles: department.roles.map((item) =>
                          item.id === role.id ? { ...item, name: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() =>
                updateDepartment(department.id, {
                  roles: [
                    ...department.roles,
                    {
                      id: `${department.id}-${department.roles.length + 1}`,
                      name: "",
                      level: "staff",
                      overrides: {},
                    },
                  ],
                })
              }
            >
              {t("onboarding.org.addRole")}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
