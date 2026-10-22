import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  canProceed: boolean;
  isCreatingAccount: boolean;
  onCancel: () => void;
}

export default function OnboardingNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onComplete,
  canProceed,
  isCreatingAccount,
  onCancel,
}: OnboardingNavigationProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="flex justify-between mt-8 pt-6 border-t border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
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
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary"
          >
            {isCreatingAccount ? "Creating Account..." : "Complete Setup"}
            <CheckCircle className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
