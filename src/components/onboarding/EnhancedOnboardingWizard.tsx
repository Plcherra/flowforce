
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { BusinessTemplate, OnboardingPosition } from '@/types/templates';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CustomTemplate, CustomSection } from '@/types/customTemplate';
import AnimatedPanel from './AnimatedPanel';
import StepSidebar from './StepSidebar';
import WizardHeader from './WizardHeader';
import WizardNavigation from './WizardNavigation';
import { ValidationManager } from './ValidationManager';
import { UserInfo, CompanyInfo } from '@/types/onboarding';
import StepRenderer from './StepRenderer';

interface Branding {
  logo: File | null;
  primaryColor: string;
  secondaryColor: string;
}

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

interface EnhancedOnboardingWizardProps {
  onComplete: (data: {
    userInfo: UserInfo;
    companyInfo: CompanyInfo;
    branding: Branding;
    template: BusinessTemplate;
    enabledSections: string[];
    customRoles: OnboardingRole[];
    positions: OnboardingPosition[];
  }) => void;
  onCancel: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const EnhancedOnboardingWizard = React.memo(function EnhancedOnboardingWizard({ onComplete, onCancel }: EnhancedOnboardingWizardProps) {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null);
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customRoles, setCustomRoles] = useState<OnboardingRole[]>([]);
  const [positions, setPositions] = useState<OnboardingPosition[]>([]);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<Partial<CustomTemplate>>({
    name: '',
    description: '',
    industry: '',
    companySize: [],
    branding: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      accentColor: '#10b981',
      fontFamily: 'Inter, sans-serif',
      headerStyle: 'modern',
      sidebarStyle: 'expanded',
      cardStyle: 'rounded',
      backgroundPattern: 'none'
    },
    sections: [],
    isPublic: false
  });
  
  // User and company info state
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    industry: '',
    size: '',
    description: '',
    website: '',
    phone: ''
  });

  const [branding, setBranding] = useState<Branding>({
    logo: null,
    primaryColor: customTemplate.branding?.primaryColor || '#3b82f6',
    secondaryColor: customTemplate.branding?.secondaryColor || '#1e40af'
  });

  const isCustomTemplate = selectedTemplate?.id === 'custom';
  const totalSteps = isCustomTemplate ? 6 : 5;

  const steps = useMemo(() => isCustomTemplate ? [
    { id: 1, title: t('onboarding.steps.info.title'), description: t('onboarding.steps.info.description') },
    { id: 2, title: t('onboarding.steps.template.title'), description: t('onboarding.steps.template.description') },
    { id: 3, title: t('onboarding.steps.custom.title'), description: t('onboarding.steps.custom.description') },
    { id: 4, title: t('onboarding.steps.sections.title'), description: t('onboarding.steps.sections.description') },
    { id: 5, title: t('onboarding.steps.roles.title'), description: t('onboarding.steps.roles.description') },
    { id: 6, title: t('onboarding.steps.review.title'), description: t('onboarding.steps.review.description') }
  ] : [
    { id: 1, title: t('onboarding.steps.info.title'), description: t('onboarding.steps.info.description') },
    { id: 2, title: t('onboarding.steps.template.title'), description: t('onboarding.steps.template.description') },
    { id: 3, title: t('onboarding.steps.sections.title'), description: t('onboarding.steps.sections.description') },
    { id: 4, title: t('onboarding.steps.roles.title'), description: t('onboarding.steps.roles.description') },
    { id: 5, title: t('onboarding.steps.review.title'), description: t('onboarding.steps.review.description') }
  ], [isCustomTemplate]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setDirection('right');
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection('left');
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleTemplateSelect = useCallback((template: BusinessTemplate) => {
    setSelectedTemplate(template);
    // Pre-select template sections when a template is chosen
    if (template.sections) {
      setEnabledSections(template.sections);
    }
  }, []);

  const handleSectionToggle = useCallback((sectionId: string, enabled: boolean) => {
    setEnabledSections(prev => 
      enabled 
        ? [...prev, sectionId]
        : prev.filter(id => id !== sectionId)
    );
  }, []);

  const handleRolesChange = useCallback((roles: OnboardingRole[]) => {
    setCustomRoles(roles);
  }, []);

  const handleCustomSectionsChange = useCallback((sections: CustomSection[]) => {
    setCustomSections(sections);
  }, []);

  const handleCustomTemplateChange = useCallback((template: Partial<CustomTemplate>) => {
    setCustomTemplate(template);
    // Update branding when custom template changes
    if (template.branding) {
      setBranding(prev => ({
        ...prev,
        primaryColor: template.branding?.primaryColor || prev.primaryColor,
        secondaryColor: template.branding?.secondaryColor || prev.secondaryColor
      }));
    }
  }, []);

  const handlePositionsChange = useCallback((newPositions: OnboardingPosition[]) => {
    setPositions(newPositions);
  }, []);

  const handleComplete = async () => {
    if (!selectedTemplate) return;

    setIsCreatingAccount(true);
    try {
      // Create user account
      const { error } = await signUp(
        userInfo.email, 
        userInfo.password, 
        userInfo.firstName, 
        userInfo.lastName
      );

      if (error) {
        toast({
          title: t('onboarding.messages.accountCreationFailed'),
          description: error.message,
          variant: "destructive",
        });
        setIsCreatingAccount(false);
        return;
      }

      // Complete onboarding with all collected data
      onComplete({
        userInfo,
        companyInfo,
        branding,
        template: selectedTemplate,
        enabledSections,
        customRoles,
        positions
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error creating account:', error);
      toast({
        title: t('onboarding.messages.setupError'),
        description: t('onboarding.messages.setupErrorDescription'),
        variant: "destructive",
      });
      setIsCreatingAccount(false);
    }
  };

  const canProceed = () => {
    return ValidationManager.canProceedToStep(
      currentStep,
      isCustomTemplate,
      userInfo,
      companyInfo,
      selectedTemplate,
      enabledSections,
      customRoles
    );
  };

  const handleStepNext = () => {
    if (currentStep === 1 && !ValidationManager.validateUserInfo(userInfo, companyInfo)) {
      return;
    }
    handleNext();
  };


  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Fixed Header */}
      <WizardHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={steps}
        onNavigateHome={() => navigate('/')}
      />

      {/* Main Content */}
      <div className="pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Main Content Area */}
            <div className="flex-1">
              <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                <CardContent className="p-8">
                  <AnimatedPanel step={currentStep} direction={direction}>
                    <StepRenderer
                      currentStep={currentStep}
                      isCustomTemplate={isCustomTemplate}
                      selectedTemplate={selectedTemplate}
                      userInfo={userInfo}
                      companyInfo={companyInfo}
                      customTemplate={customTemplate}
                      enabledSections={enabledSections}
                      customSections={customSections}
                      customRoles={customRoles}
                      positions={positions}
                      onUserInfoChange={setUserInfo}
                      onCompanyInfoChange={setCompanyInfo}
                      onTemplateSelect={handleTemplateSelect}
                      onCustomTemplateChange={handleCustomTemplateChange}
                      onSectionToggle={handleSectionToggle}
                      onCustomSectionsChange={handleCustomSectionsChange}
                      onRolesChange={handleRolesChange}
                      onPositionsChange={handlePositionsChange}
                    />
                  </AnimatedPanel>

                  {/* Navigation */}
                  <motion.div 
                    className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <WizardNavigation
                      currentStep={currentStep}
                      totalSteps={totalSteps}
                      canProceed={canProceed()}
                      isLastStep={currentStep === totalSteps}
                      isCreatingAccount={isCreatingAccount}
                      onBack={handleBack}
                      onNext={handleStepNext}
                      onComplete={handleComplete}
                      onCancel={onCancel}
                    />
                  </motion.div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <StepSidebar 
                currentStep={currentStep}
                steps={steps}
                selectedTemplate={selectedTemplate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Drawer */}
      <div className="lg:hidden">
        <StepSidebar 
          currentStep={currentStep}
          steps={steps}
          selectedTemplate={selectedTemplate}
          isMobile={true}
        />
      </div>
    </motion.div>
  );
});

export default EnhancedOnboardingWizard;
