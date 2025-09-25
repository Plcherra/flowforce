import { BusinessTemplate, OnboardingPosition } from '@/types/templates';
import { CustomSection } from '@/types/customTemplate';
import { UserInfo, CompanyInfo, OnboardingRole } from '@/types/onboarding';
import UserInfoStep from './UserInfoStep';
import TemplateSelectionStep from './TemplateSelectionStep';
import CustomTemplateBuilder from './CustomTemplateBuilder';
import SectionCustomizationStep from './SectionCustomizationStep';
import RoleSetupStep from './RoleSetupStep';
import ReviewStep from './ReviewStep';

interface OnboardingStepRendererProps {
  currentStep: number;
  isCustomTemplate: boolean;
  userInfo: UserInfo;
  companyInfo: CompanyInfo;
  selectedTemplate: BusinessTemplate | null;
  enabledSections: string[];
  customSections: CustomSection[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
  customTemplate: any;
  onUserInfoChange: (userInfo: UserInfo) => void;
  onCompanyInfoChange: (companyInfo: CompanyInfo) => void;
  onTemplateSelect: (template: BusinessTemplate) => void;
  onTemplateChange: (template: any) => void;
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  onCustomSectionsChange: (sections: CustomSection[]) => void;
  onRolesChange: (roles: OnboardingRole[]) => void;
  onPositionsChange: (positions: OnboardingPosition[]) => void;
}

export default function OnboardingStepRenderer({
  currentStep,
  isCustomTemplate,
  userInfo,
  companyInfo,
  selectedTemplate,
  enabledSections,
  customSections,
  customRoles,
  positions,
  customTemplate,
  onUserInfoChange,
  onCompanyInfoChange,
  onTemplateSelect,
  onTemplateChange,
  onSectionToggle,
  onCustomSectionsChange,
  onRolesChange,
  onPositionsChange
}: OnboardingStepRendererProps) {
  
  if (isCustomTemplate) {
    switch (currentStep) {
      case 1:
        return (
          <UserInfoStep
            userInfo={userInfo}
            companyInfo={companyInfo}
            onUserInfoChange={onUserInfoChange}
            onCompanyInfoChange={onCompanyInfoChange}
          />
        );
      case 2:
        return (
          <TemplateSelectionStep
            selectedTemplate={selectedTemplate}
            onTemplateSelect={onTemplateSelect}
          />
        );
      case 3:
        return (
          <CustomTemplateBuilder
            template={customTemplate}
            onTemplateChange={onTemplateChange}
            onSave={() => {
              // TODO: Implement custom template save functionality
            }}
            onPreview={() => {
              // TODO: Implement custom template preview functionality
            }}
          />
        );
      case 4:
        return selectedTemplate ? (
          <SectionCustomizationStep
            selectedTemplate={selectedTemplate}
            enabledSections={enabledSections}
            onSectionToggle={onSectionToggle}
            customSections={customSections}
            onCustomSectionsChange={onCustomSectionsChange}
          />
        ) : null;
      case 5:
        return selectedTemplate ? (
          <RoleSetupStep
            selectedTemplate={selectedTemplate}
            customRoles={customRoles}
            positions={positions}
            onRolesChange={onRolesChange}
            onPositionsChange={onPositionsChange}
          />
        ) : null;
      case 6:
        return selectedTemplate ? (
          <ReviewStep
            selectedTemplate={selectedTemplate}
            enabledSections={enabledSections}
            customRoles={customRoles}
            positions={positions}
          />
        ) : null;
      default:
        return null;
    }
  } else {
    switch (currentStep) {
      case 1:
        return (
          <UserInfoStep
            userInfo={userInfo}
            companyInfo={companyInfo}
            onUserInfoChange={onUserInfoChange}
            onCompanyInfoChange={onCompanyInfoChange}
          />
        );
      case 2:
        return (
          <TemplateSelectionStep
            selectedTemplate={selectedTemplate}
            onTemplateSelect={onTemplateSelect}
          />
        );
      case 3:
        return selectedTemplate ? (
          <SectionCustomizationStep
            selectedTemplate={selectedTemplate}
            enabledSections={enabledSections}
            onSectionToggle={onSectionToggle}
            customSections={customSections}
            onCustomSectionsChange={onCustomSectionsChange}
          />
        ) : null;
      case 4:
        return selectedTemplate ? (
          <RoleSetupStep
            selectedTemplate={selectedTemplate}
            customRoles={customRoles}
            positions={positions}
            onRolesChange={onRolesChange}
            onPositionsChange={onPositionsChange}
          />
        ) : null;
      case 5:
        return selectedTemplate ? (
          <ReviewStep
            selectedTemplate={selectedTemplate}
            enabledSections={enabledSections}
            customRoles={customRoles}
            positions={positions}
          />
        ) : null;
      default:
        return null;
    }
  }
}