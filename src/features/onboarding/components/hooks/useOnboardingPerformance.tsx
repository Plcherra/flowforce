import { useMemo, useCallback } from "react";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";
import { CustomSection } from "@/types/customTemplate";
import { CompanyRole, UserMetadata } from "@/types/common";

interface PerformanceOptimizedProps {
  selectedTemplate: BusinessTemplate | null;
  enabledSections: string[];
  customSections: CustomSection[];
  customRoles: CompanyRole[];
  positions: OnboardingPosition[];
}

export function useOnboardingPerformance({
  selectedTemplate,
  enabledSections,
  customSections,
  customRoles,
  positions,
}: PerformanceOptimizedProps) {
  // Memoize expensive calculations
  const totalSections = useMemo(() => {
    const templateSections = selectedTemplate?.sections?.length || 0;
    const customSectionCount = customSections.length;
    return templateSections + customSectionCount;
  }, [selectedTemplate?.sections, customSections.length]);

  const enabledSectionCount = useMemo(() => {
    return enabledSections.length;
  }, [enabledSections.length]);

  const hasRequiredRoles = useMemo(() => {
    return customRoles.length >= 4;
  }, [customRoles.length]);

  const completionProgress = useMemo(() => {
    const totalItems = 4; // template, sections, roles, positions
    let completed = 0;

    if (selectedTemplate) completed++;
    if (enabledSections.length > 0) completed++;
    if (customRoles.length >= 4) completed++;
    if (positions.length > 0) completed++;

    return Math.round((completed / totalItems) * 100);
  }, [
    selectedTemplate,
    enabledSections.length,
    customRoles.length,
    positions.length,
  ]);

  // Memoize validation functions
  const isStepValid = useCallback(
    (
      step: number,
      userInfo: UserMetadata,
      companyInfo: Record<string, unknown>,
    ) => {
      switch (step) {
        case 1:
          return Boolean(
            userInfo.firstName &&
              userInfo.lastName &&
              userInfo.email &&
              userInfo.password &&
              companyInfo.name &&
              companyInfo.industry &&
              companyInfo.size,
          );
        case 2:
          return Boolean(selectedTemplate);
        case 3:
          return enabledSections.length > 0;
        case 4:
          return customRoles.length >= 4;
        case 5:
          return true;
        default:
          return false;
      }
    },
    [selectedTemplate, enabledSections.length, customRoles.length],
  );

  return {
    totalSections,
    enabledSectionCount,
    hasRequiredRoles,
    completionProgress,
    isStepValid,
  };
}
