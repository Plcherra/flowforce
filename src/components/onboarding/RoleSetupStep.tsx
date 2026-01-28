import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";
import OnboardingRoleManager from "@/components/onboarding/OnboardingRoleManager";
import { useTranslation } from "react-i18next";

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

interface RoleSetupStepProps {
  selectedTemplate: BusinessTemplate;
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
  onRolesChange: (roles: OnboardingRole[]) => void;
  onPositionsChange: (positions: OnboardingPosition[]) => void;
}

export default function RoleSetupStep({
  selectedTemplate,
  customRoles,
  positions,
  onRolesChange,
  onPositionsChange,
}: RoleSetupStepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center">
          <CheckCircle className="mr-2 h-6 w-6" />
          {t("onboarding.roles.title")}
        </CardTitle>
        <CardDescription>{t("onboarding.roles.description")}</CardDescription>
      </CardHeader>

      <OnboardingRoleManager
        selectedTemplate={selectedTemplate}
        roles={customRoles}
        positions={positions}
        onRolesChange={onRolesChange}
        onPositionsChange={onPositionsChange}
      />
    </div>
  );
}
