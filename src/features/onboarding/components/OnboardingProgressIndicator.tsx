import { useTranslation } from "react-i18next";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface OnboardingProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completionProgress: number;
  enabledSectionCount: number;
  totalSections: number;
  hasRequiredRoles: boolean;
}

export const OnboardingProgressIndicator = memo(
  function OnboardingProgressIndicator({
    currentStep,
    totalSteps,
    completionProgress,
    enabledSectionCount,
    hasRequiredRoles,
  }: OnboardingProgressIndicatorProps) {
    const { t } = useTranslation();
    const getProgressIcon = () => {
      if (completionProgress === 100)
        return <CheckCircle className="h-4 w-4 text-success" />;
      if (completionProgress > 50) {
        return <Clock className="h-4 w-4 text-warning" />;
      }
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    };

    return (
      <div className="flex items-center gap-2 text-sm">
        {getProgressIcon()}
        <span className="font-medium">
          {t("onboarding.percentComplete", { count: completionProgress })}
        </span>

        <div className="flex gap-1 ml-2">
          <Badge variant="outline" className="text-xs">
            {t("onboarding.stepOf", {
              current: currentStep,
              total: totalSteps,
            })}
          </Badge>

          {enabledSectionCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t("onboarding.sectionCount", { count: enabledSectionCount })}
            </Badge>
          )}

          {hasRequiredRoles && (
            <Badge variant="secondary" className="text-xs text-success">
              {t("onboarding.rolesConfigured")}
            </Badge>
          )}
        </div>
      </div>
    );
  },
);
