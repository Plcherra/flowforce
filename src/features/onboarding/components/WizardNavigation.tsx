import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isLastStep?: boolean;
  isCreatingAccount?: boolean;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export default function WizardNavigation({
  currentStep,
  totalSteps,
  canProceed,
  isLastStep: isLastStep = false,
  isCreatingAccount = false,
  onBack,
  onNext,
  onComplete,
  onCancel,
}: WizardNavigationProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between mt-8 pt-6 border-t">
      <div>
        {currentStep > 1 ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("onboarding.wizard.back")}
          </Button>
        ) : (
          <Button variant="outline" onClick={onCancel}>
            {t("onboarding.wizard.cancel")}
          </Button>
        )}
      </div>
      <div>
        {currentStep < totalSteps ? (
          <Button onClick={onNext} disabled={!canProceed}>
            {t("onboarding.wizard.next")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            disabled={!canProceed || isCreatingAccount}
          >
            {isCreatingAccount ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("onboarding.wizard.creating")}
              </>
            ) : (
              <>
                {t("onboarding.wizard.complete")}
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
