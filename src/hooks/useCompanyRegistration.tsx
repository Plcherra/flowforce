import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserInfo, CompanyInfo, Branding, OnboardingRole } from '@/types/onboarding';
import { BusinessTemplate, OnboardingPosition } from '@/types/templates';
import { logger } from '@/utils/logger';

interface RegistrationData {
  userInfo: UserInfo;
  companyInfo: CompanyInfo;
  branding: Branding;
  template: BusinessTemplate;
  enabledSections: string[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
}

interface RegistrationError {
  type: 'auth' | 'validation' | 'database' | 'network';
  message: string;
  details?: string;
}

export function useCompanyRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RegistrationError | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const transformRolesForDatabase = (roles: OnboardingRole[]) => {
    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || '',
      color: role.color,
      icon: role.icon,
      hierarchy_level: role.hierarchy_level,
      permissions: role.permissions || {},
      is_system_role: role.is_system_role || false
    }));
  };

  const transformPositionsForDatabase = (positions: OnboardingPosition[]) => {
    return positions.map(position => ({
      id: position.id,
      name: position.name,
      description: position.description || '',
      roleId: position.roleId,
      permissions: position.permissions || {}
    }));
  };

  const validateRegistrationData = (data: RegistrationData): RegistrationError | null => {
    // Validate user info
    if (!data.userInfo.email || !data.userInfo.password || !data.userInfo.firstName || !data.userInfo.lastName) {
      return {
        type: 'validation',
        message: 'Please fill in all required user information fields.'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.userInfo.email)) {
      return {
        type: 'validation',
        message: 'Please enter a valid email address.'
      };
    }

    // Validate password strength
    if (data.userInfo.password.length < 8) {
      return {
        type: 'validation',
        message: 'Password must be at least 8 characters long.'
      };
    }

    // Validate company info
    if (!data.companyInfo.name || !data.companyInfo.industry) {
      return {
        type: 'validation',
        message: 'Please fill in all required company information fields.'
      };
    }

    return null;
  };

  const getAppUrl = () => {
    // Use the current window location for email redirects
    return window.location.origin;
  };

  const createCompanyWithUser = async (data: RegistrationData) => {
    const transformedRoles = transformRolesForDatabase(data.customRoles);
    const transformedPositions = transformPositionsForDatabase(data.positions);

    // Use the existing database function that handles both user creation and company setup
    const { data: result, error } = await supabase.rpc('create_company_with_owner', {
      user_email: data.userInfo.email,
      user_password: data.userInfo.password,
      user_first_name: data.userInfo.firstName,
      user_last_name: data.userInfo.lastName,
      company_data: {
        name: data.companyInfo.name,
        industry: data.companyInfo.industry,
        size: data.companyInfo.size,
        description: data.companyInfo.description,
        website: data.companyInfo.website,
        phone: data.companyInfo.phone,
        primary_color: data.branding.primaryColor,
        secondary_color: data.branding.secondaryColor,
        template_id: data.template.id,
        template_name: data.template.name,
        enabled_sections: data.enabledSections,
        template_config: {
          industry: data.template.industry,
          defaultRoles: data.template.defaultRoles,
          customFields: data.template.customFields,
          suggestedPositions: data.template.suggestedPositions
        }
      },
      custom_roles: transformedRoles,
      positions_data: transformedPositions
    });

    if (error) {
      throw error;
    }

    return result;
  };

  const handleRegistrationError = (error: unknown): RegistrationError => {
    logger.error('Registration error', { error, tags: ['error'] });

    if (error.message?.includes('email') || error.message?.includes('User already registered')) {
      return {
        type: 'validation',
        message: 'An account with this email already exists. Please use a different email or sign in.',
        details: error.message
      };
    }

    if (error.message?.includes('password') || error.message?.includes('weak') || error.message?.includes('guess')) {
      return {
        type: 'validation',
        message: 'Your password is too weak or common. Please create a stronger, more unique password.',
        details: error.message
      };
    }

    if (error.message?.includes('rate_limit') || error.message?.includes('58 seconds')) {
      return {
        type: 'auth',
        message: 'Too many registration attempts. Please wait about a minute before trying again.',
        details: error.message
      };
    }

    if (error.message?.includes('role')) {
      return {
        type: 'database',
        message: 'There was an issue setting up your company roles. Please check your role configuration.',
        details: error.message
      };
    }

    if (error.message?.includes('position')) {
      return {
        type: 'database',
        message: 'There was an issue setting up your company positions. Please check your position configuration.',
        details: error.message
      };
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        details: error.message
      };
    }

    return {
      type: 'database',
      message: error.message || 'There was an error setting up your company. Please try again.',
      details: error.message
    };
  };

  const register = async (data: RegistrationData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate input data
      const validationError = validateRegistrationData(data);
      if (validationError) {
        throw new Error(validationError.message);
      }

      // Create user and company in a single flow
      await createCompanyWithUser(data);

      // Success feedback
      toast({
        title: "Welcome to FlowForce!",
        description: `${data.companyInfo.name} has been set up successfully. Welcome to your new workspace!`,
      });

      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error: any) {
      const registrationError = handleRegistrationError(error);
      setError(registrationError);

      toast({
        title: "Registration Failed",
        description: registrationError.message,
        variant: "destructive",
      });

      throw registrationError;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    register,
    isLoading,
    error,
    clearError
  };
}