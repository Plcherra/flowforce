import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Settings,
  Users,
  CheckCircle,
  FileCheck,
  type LucideIcon,
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

const stepIcons: Record<number, LucideIcon> = {
  1: Building2,
  2: Settings,
  3: Users,
  4: CheckCircle,
  5: FileCheck,
  6: FileCheck,
};

export default function StepSidebar({
  currentStep,
  steps,
  selectedTemplate,
  isMobile = false,
}: StepSidebarProps) {
  const { t } = useTranslation();
  const currentStepData = steps.find((step) => step.id === currentStep);
  const IconComponent = stepIcons[currentStep] ?? FileCheck;
  const localizedTemplate = selectedTemplate
    ? I18nHelpers.getLocalizedTemplate(selectedTemplate.id, selectedTemplate)
    : null;

  if (isMobile) {
    return (
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {currentStepData?.title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {currentStepData?.description}
              </p>
            </div>
            {selectedTemplate && (
              <Badge variant="secondary" className="shrink-0">
                {localizedTemplate?.name ?? selectedTemplate.name}
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
      <Card className="shadow-lg bg-background/90 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl">
              <IconComponent className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {currentStepData?.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
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
            <h4 className="font-medium text-foreground mb-2">
              {t("onboarding.sidebar.whatYoureDoing")}:
            </h4>
            <p className="text-sm text-muted-foreground">
              {currentStepData?.description}
            </p>
          </div>

          {selectedTemplate && (
            <div>
              <h4 className="font-medium text-foreground mb-2">
                {t("onboarding.sidebar.selectedTemplate")}:
              </h4>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary">{selectedTemplate.industry}</Badge>
                </div>
                <p className="font-medium text-sm">
                  {localizedTemplate?.name ?? selectedTemplate.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {localizedTemplate?.description ??
                    selectedTemplate.description}
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium text-foreground mb-2">
              {t("onboarding.sidebar.progress")}:
            </h4>
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 text-sm ${
                    step.id < currentStep
                      ? "text-success"
                      : step.id === currentStep
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      step.id < currentStep
                        ? "bg-success"
                        : step.id === currentStep
                          ? "bg-primary"
                          : "bg-muted-foreground"
                    }`}
                  />
                  <span>{step.title}</span>
                  {step.id < currentStep && (
                    <CheckCircle className="h-3 w-3 text-success" />
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
