import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CompactStepProgress from "./CompactStepProgress";

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export default function OnboardingHeader({
  currentStep,
  totalSteps,
  steps,
}: OnboardingHeaderProps) {
  const navigate = useNavigate();

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Back to Home */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-[#3F51B5]" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                FlowForce
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-gray-600 dark:text-gray-300 hover:text-[#3F51B5] hover:bg-[#3F51B5]/5"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Compact Progress */}
          <div className="flex-1 max-w-md mx-8">
            <CompactStepProgress
              currentStep={currentStep}
              totalSteps={totalSteps}
              steps={steps}
            />
          </div>

          {/* Step Info */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Step {currentStep} of {totalSteps}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {steps[currentStep - 1]?.title}
            </p>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
