import { useTranslation } from "react-i18next";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
  is_active?: boolean;
}

interface ReviewStepProps {
  selectedTemplate: BusinessTemplate;
  enabledSections: string[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
}

export default function ReviewStep({
  selectedTemplate,
  enabledSections,
  customRoles,
  positions,
}: ReviewStepProps) {
  const { t } = useTranslation();
  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center">
          <CheckCircle className="mr-2 h-6 w-6" />
          {t("onboarding.reviewYourConfiguration")}
        </CardTitle>
        <CardDescription>
          {t("onboarding.reviewYourWorkspaceConfigurationBeforeCompletingSetup")}
        </CardDescription>
      </CardHeader>

      <div className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-foreground mb-2">{t("onboarding.businessTemplate")}</h4>
          <div className="flex items-center space-x-3">
            <Badge className="bg-success-muted text-success">
              {selectedTemplate.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedTemplate.industry} industry
            </span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-foreground mb-3">
            Enabled Sections ({enabledSections.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {enabledSections.map((sectionId) => (
              <Badge key={sectionId} variant="outline" className="text-xs">
                {sectionId.replace("-", " ")}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-foreground mb-3">
            Your Company Roles ({customRoles.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {customRoles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
                {role.is_active === false ? " (archived)" : ""}
              </Badge>
            ))}
          </div>
        </div>

        {positions.length > 0 && (
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-foreground mb-3">
              Positions ({positions.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {positions.map((position) => (
                <Badge key={position.id} variant="outline" className="text-xs">
                  {position.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
