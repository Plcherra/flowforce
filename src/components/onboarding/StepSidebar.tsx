import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Settings,
  Users,
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { BusinessTemplate } from "@/types/templates";
import { useTranslation } from "react-i18next";
import { I18nHelpers } from "@/utils/i18nHelpers";

interface StepSidebarProps {
  currentStep: number;
  steps: Array<{
    id: number;
    title: string;
    description: string;
  }>;
  selectedTemplate?: BusinessTemplate | null;
  isMobile?: boolean;
}

const stepIcons = {
  1: Building2,
  2: Settings,
  3: Users,
  4: CheckCircle,
  5: FileCheck,
};

export default function StepSidebar({
  currentStep,
  steps,
  selectedTemplate,
  isMobile = false,
}: StepSidebarProps) {
  const { t } = useTranslation();
  const currentStepData = steps.find((step) => step.id === currentStep);
  const IconComponent = stepIcons[currentStep as keyof typeof stepIcons];

  if (isMobile) {
    return (
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {currentStepData?.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {currentStepData?.description}
              </p>
            </div>
            {selectedTemplate && (
              <Badge variant="secondary" className="shrink-0">
                {selectedTemplate.name}
              </Badge>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="sticky top-28 w-80"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="shadow-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {currentStepData?.title}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("onboarding.wizard.stepOf", {
                  current: currentStep,
                  total: steps.length,
                })}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {t("onboarding.sidebar.whatYoureDoing")}:
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentStepData?.description}
            </p>
          </div>

          {selectedTemplate && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {t("onboarding.sidebar.selectedTemplate")}:
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary">{selectedTemplate.industry}</Badge>
                </div>
                <p className="font-medium text-sm">
                  {I18nHelpers.getLocalizedTemplate(selectedTemplate.id).name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {
                    I18nHelpers.getLocalizedTemplate(selectedTemplate.id)
                      .description
                  }
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {t("onboarding.sidebar.progress")}:
            </h4>
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 text-sm ${
                    step.id < currentStep
                      ? "text-green-600 dark:text-green-400"
                      : step.id === currentStep
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      step.id < currentStep
                        ? "bg-green-500"
                        : step.id === currentStep
                          ? "bg-blue-500"
                          : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  <span>{step.title}</span>
                  {step.id < currentStep && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
