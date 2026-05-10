interface UseOnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  selectedTemplate: any;
  isCustomTemplate: boolean;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  setDirection: (direction: "left" | "right") => void;
}

export function useOnboardingNavigation({
  currentStep,
  totalSteps,
  selectedTemplate,
  isCustomTemplate,
  setCurrentStep,
  setDirection,
}: UseOnboardingNavigationProps) {
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setDirection("right");
      // Skip custom template step (step 3) if not custom template
      if (currentStep === 2 && selectedTemplate?.id !== "custom") {
        setCurrentStep((prev) => prev + 2); // Skip step 3 (custom template), go to step 4 (sections)
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection("left");
      // Skip custom template step (step 3) if not custom template when going back
      if (currentStep === 4 && selectedTemplate?.id !== "custom") {
        setCurrentStep((prev) => prev - 2); // Skip step 3 (custom template), go back to step 2 (template)
      } else {
        setCurrentStep((prev) => prev - 1);
      }
    }
  };

  const canProceed = () => {
    // Implementation would check specific step requirements
    return true; // Simplified for now
  };

  const steps = isCustomTemplate
    ? [
        {
          id: 1,
          title: "Info",
          description: "Your information and company details",
        },
        {
          id: 2,
          title: "Template",
          description: "Choose your business template",
        },
        { id: 3, title: "Custom", description: "Build custom template" },
        {
          id: 4,
          title: "Sections",
          description: "Customize your workspace sections",
        },
        { id: 5, title: "Roles", description: "Setup roles and positions" },
        { id: 6, title: "Review", description: "Review and complete setup" },
      ]
    : [
        {
          id: 1,
          title: "Info",
          description: "Your information and company details",
        },
        {
          id: 2,
          title: "Template",
          description: "Choose your business template",
        },
        {
          id: 3,
          title: "Sections",
          description: "Customize your workspace sections",
        },
        { id: 4, title: "Roles", description: "Setup roles and positions" },
        { id: 5, title: "Review", description: "Review and complete setup" },
      ];

  return {
    handleNext,
    handleBack,
    canProceed,
    steps,
  };
}
