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
  return (
    <motion.div
      className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div>
        {currentStep > 1 ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <div>
        {currentStep < totalSteps ? (
          <Button onClick={onNext} disabled={!canProceed}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            disabled={!canProceed || isCreatingAccount}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {isCreatingAccount ? "Creating Account..." : "Complete Setup"}
            <CheckCircle className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
