import { toast } from '@/hooks/use-toast';
import i18n from '@/i18n/config';
import { validatePassword } from '@/utils/passwordValidation';
import { UserInfo, CompanyInfo, OnboardingRole } from '@/types/onboarding';
import { BusinessTemplate } from '@/types/templates';
import { VALIDATION_RULES } from '@/config/constants';

export class ValidationManager {
  
  static validateUserInfo(userInfo: UserInfo, companyInfo: CompanyInfo): boolean {
    const errors: string[] = [];
    
    if (!userInfo.firstName.trim()) errors.push(i18n.t('onboarding.validation.errors.firstName'));
    if (!userInfo.lastName.trim()) errors.push(i18n.t('onboarding.validation.errors.lastName'));
    if (!userInfo.email.trim()) errors.push(i18n.t('onboarding.validation.errors.email'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInfo.email)) errors.push(i18n.t('onboarding.validation.errors.email'));
    
    // Enhanced password validation using centralized utility
    const passwordValidation = validatePassword(userInfo.password, {
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      email: userInfo.email,
      companyName: companyInfo.name
    });
    
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
    
    if (!companyInfo.name.trim()) errors.push(i18n.t('onboarding.validation.errors.companyName'));
    if (!companyInfo.industry) errors.push(i18n.t('onboarding.validation.errors.industry'));
    if (!companyInfo.size) errors.push(i18n.t('onboarding.validation.errors.size'));

    if (errors.length > 0) {
      toast({
        title: i18n.t('onboarding.validation.completeRequired'),
        description: errors[0], // Show the first error, which will be the password error if it exists
        variant: "destructive",
      });
      return false;
    }
    return true;
  }

  static canProceedToStep(
    step: number, 
    isCustomTemplate: boolean,
    userInfo: UserInfo,
    companyInfo: CompanyInfo,
    selectedTemplate: BusinessTemplate | null,
    enabledSections: string[],
    customRoles: OnboardingRole[]
  ): boolean {
    if (isCustomTemplate) {
      switch (step) {
        case 1: {
          const passwordValidation = validatePassword(userInfo.password, {
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userInfo.email,
            companyName: companyInfo.name,
          });
          return (
            Boolean(
              userInfo.firstName &&
                userInfo.lastName &&
                userInfo.email &&
                userInfo.password &&
                companyInfo.name &&
                companyInfo.industry &&
                companyInfo.size,
            ) && passwordValidation.isValid
          );
        }
        case 2:
          return selectedTemplate !== null;
        case 3:
          return true; // Custom template step is optional
        case 4:
          return enabledSections.length > 0;
        case 5:
          return customRoles.length >= VALIDATION_RULES.ONBOARDING.MIN_ROLES_REQUIRED;
        case 6:
          return true;
        default:
          return false;
      }
    } else {
      switch (step) {
        case 1: {
          const passwordValidation = validatePassword(userInfo.password, {
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userInfo.email,
            companyName: companyInfo.name,
          });
          return (
            Boolean(
              userInfo.firstName &&
                userInfo.lastName &&
                userInfo.email &&
                userInfo.password &&
                companyInfo.name &&
                companyInfo.industry &&
                companyInfo.size,
            ) && passwordValidation.isValid
          );
        }
        case 2:
          return selectedTemplate !== null;
        case 3:
          return enabledSections.length > 0;
        case 4:
          return customRoles.length >= VALIDATION_RULES.ONBOARDING.MIN_ROLES_REQUIRED;
        case 5:
          return true;
        default:
          return false;
      }
    }
  }
}
