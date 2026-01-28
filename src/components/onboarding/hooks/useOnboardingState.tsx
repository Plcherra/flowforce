import { useState } from "react";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";
import { CustomSection } from "@/types/customTemplate";
import {
  UserInfo,
  CompanyInfo,
  Branding,
  OnboardingRole,
} from "@/types/onboarding";

export function useOnboardingState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [selectedTemplate, setSelectedTemplate] =
    useState<BusinessTemplate | null>(null);
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customRoles, setCustomRoles] = useState<OnboardingRole[]>([]);
  const [positions, setPositions] = useState<OnboardingPosition[]>([]);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    industry: "",
    size: "",
    description: "",
    website: "",
    phone: "",
  });

  const [branding] = useState<Branding>({
    logo: null,
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
  });

  const isCustomTemplate = selectedTemplate?.id === "custom";
  const totalSteps = isCustomTemplate ? 6 : 5;

  const handleTemplateSelect = (template: BusinessTemplate) => {
    setSelectedTemplate(template);
    if (template.sections) {
      setEnabledSections(template.sections);
    }
  };

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setEnabledSections((prev) =>
      enabled ? [...prev, sectionId] : prev.filter((id) => id !== sectionId),
    );
  };

  const handleCustomSectionsChange = (sections: CustomSection[]) => {
    setCustomSections(sections);
  };

  const handleRolesChange = (roles: OnboardingRole[]) => {
    setCustomRoles(roles);
  };

  const handlePositionsChange = (newPositions: OnboardingPosition[]) => {
    setPositions(newPositions);
  };

  return {
    // State
    currentStep,
    direction,
    selectedTemplate,
    enabledSections,
    customSections,
    customRoles,
    positions,
    userInfo,
    companyInfo,
    branding,
    isCustomTemplate,
    totalSteps,
    // Setters
    setCurrentStep,
    setDirection,
    setUserInfo,
    setCompanyInfo,
    // Handlers
    handleTemplateSelect,
    handleSectionToggle,
    handleCustomSectionsChange,
    handleRolesChange,
    handlePositionsChange,
  };
}
