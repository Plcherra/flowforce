import { useNavigate } from "@/lib/router-adapter";
import { useTranslation } from "react-i18next";
import EnhancedOnboardingWizard from "@/features/onboarding/components/EnhancedOnboardingWizard";
import { useCompanyRegistration } from "@/hooks/useCompanyRegistration";
import {
  UserInfo,
  CompanyInfo,
  Branding,
  OnboardingRole,
} from "@/types/onboarding";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";

export default function CompanyRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useCompanyRegistration();

  const handleOnboardingComplete = async (data: {
    userInfo: UserInfo;
    companyInfo: CompanyInfo;
    branding: Branding;
    template: BusinessTemplate;
    enabledSections: string[];
    customRoles: OnboardingRole[];
    positions: OnboardingPosition[];
  }) => {
    await register(data);
  };

  const handleCancel = () => {
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-primary to-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {t("onboarding.wizard.settingUp")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <EnhancedOnboardingWizard
      onComplete={handleOnboardingComplete}
      onCancel={handleCancel}
    />
  );
}
