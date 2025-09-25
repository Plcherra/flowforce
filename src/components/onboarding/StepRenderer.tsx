import React from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessTemplate, OnboardingPosition } from '@/types/templates';
import { CustomTemplate, CustomSection } from '@/types/customTemplate';
import CustomTemplateBuilder from './CustomTemplateBuilder';
import UserInfoStep from './UserInfoStep';
import TemplateSelectionStep from './TemplateSelectionStep';
import SectionCustomizationStep from './SectionCustomizationStep';
import RoleSetupStep from './RoleSetupStep';
import ReviewStep from './ReviewStep';
import { UserInfo, CompanyInfo, OnboardingRole } from '@/types/onboarding';

interface StepRendererProps {
  currentStep: number;
  isCustomTemplate: boolean;
  selectedTemplate: BusinessTemplate | null;
  userInfo: UserInfo;
  companyInfo: CompanyInfo;
  customTemplate: Partial<CustomTemplate>;
  enabledSections: string[];
  customSections: CustomSection[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
  onUserInfoChange: (userInfo: UserInfo) => void;
  onCompanyInfoChange: (companyInfo: CompanyInfo) => void;
  onTemplateSelect: (template: BusinessTemplate) => void;
  onCustomTemplateChange: (template: Partial<CustomTemplate>) => void;
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  onCustomSectionsChange: (sections: CustomSection[]) => void;
  onRolesChange: (roles: OnboardingRole[]) => void;
  onPositionsChange: (positions: OnboardingPosition[]) => void;
}

export default function StepRenderer({
  currentStep,
  isCustomTemplate,
  selectedTemplate,
  userInfo,
  companyInfo,
  customTemplate,
  enabledSections,
  customSections,
  customRoles,
  positions,
  onUserInfoChange,
  onCompanyInfoChange,
  onTemplateSelect,
  onCustomTemplateChange,
  onSectionToggle,
  onCustomSectionsChange,
  onRolesChange,
  onPositionsChange
}: StepRendererProps) {
  const { t } = useTranslation();
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
            onTemplateChange={onCustomTemplateChange}
            onSave={() => {
              // TODO: Implement custom template save functionality
            }}
            onPreview={() => {
              // TODO: Implement custom template preview functionality
            }}
          />
        );
      case 4:
        if (!selectedTemplate) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('onboarding.fallbacks.selectTemplateFirst')}</p>
            </div>
          );
        }
        return (
          <SectionCustomizationStep
            selectedTemplate={selectedTemplate}
            enabledSections={enabledSections}
            onSectionToggle={onSectionToggle}
            customSections={customSections}
            onCustomSectionsChange={onCustomSectionsChange}
          />
        );
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