
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EnhancedOnboardingWizard from '@/components/onboarding/EnhancedOnboardingWizard';
import { useCompanyRegistration } from '@/hooks/useCompanyRegistration';
import { UserInfo, CompanyInfo, Branding, OnboardingRole } from '@/types/onboarding';
import { BusinessTemplate, OnboardingPosition } from '@/types/templates';

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
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('onboarding.wizard.settingUp')}
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
