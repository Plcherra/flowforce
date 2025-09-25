import { UserInfo, CompanyInfo, OnboardingRole } from '@/types/onboarding';
import { OnboardingPosition } from '@/types/templates';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUserInfo = (userInfo: UserInfo): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!userInfo.firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!userInfo.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!userInfo.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(userInfo.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!userInfo.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(userInfo.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateCompanyInfo = (companyInfo: CompanyInfo): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!companyInfo.name.trim()) {
    errors.name = 'Company name is required';
  }

  if (!companyInfo.industry) {
    errors.industry = 'Industry is required';
  }

  if (!companyInfo.size) {
    errors.size = 'Company size is required';
  }

  // Optional field validations
  if (companyInfo.website && !isValidUrl(companyInfo.website)) {
    errors.website = 'Please enter a valid website URL';
  }

  if (companyInfo.phone && !isValidPhone(companyInfo.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleanPhone);
};

export const sanitizeUserInput = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

export const generateEmployeeId = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EMP-${year}-${random}`;
};

export const formatRoleForDatabase = (role: OnboardingRole) => ({
  id: role.id,
  name: sanitizeUserInput(role.name),
  description: sanitizeUserInput(role.description || ''),
  color: role.color,
  icon: role.icon,
  hierarchy_level: role.hierarchy_level,
  permissions: role.permissions || {},
  is_system_role: role.is_system_role || false
});

export const formatPositionForDatabase = (position: OnboardingPosition) => ({
  id: position.id,
  name: sanitizeUserInput(position.name),
  description: sanitizeUserInput(position.description || ''),
  roleId: position.roleId,
  permissions: position.permissions || {}
});

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};

export const isNetworkError = (error: any): boolean => {
  return error?.message?.includes('fetch') || 
         error?.message?.includes('network') || 
         error?.name === 'NetworkError';
};

export const isAuthError = (error: any): boolean => {
  return error?.message?.includes('email') || 
         error?.message?.includes('password') || 
         error?.message?.includes('already registered');
};