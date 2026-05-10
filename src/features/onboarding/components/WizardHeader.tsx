import { Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
  steps?: { id: number; title: string; description: string }[];
  onNavigateHome?: () => void;
}

export default function WizardHeader({
  currentStep,
  totalSteps,
}: WizardHeaderProps) {
  const { t } = useTranslation();
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-2 mb-4">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-gray-900">
          {t("onboarding.wizard.title")}
        </h1>
      </div>
      <h2 className="text-2xl font-semibold text-gray-800">
        {t("onboarding.wizard.subtitle")}
      </h2>
      <p className="text-gray-600 mt-2">{t("onboarding.wizard.description")}</p>
      <div className="mt-4 max-w-md mx-auto">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">
          {t("onboarding.wizard.stepOf", {
            current: currentStep,
            total: totalSteps,
          })}
        </p>
      </div>
    </div>
  );
}
