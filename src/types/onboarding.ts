// Centralized type definitions for onboarding
import { OnboardingPosition } from "@/types/templates";
export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface CompanyInfo {
  name: string;
  industry: string;
  size: string;
  description: string;
  website: string;
  phone: string;
}

export interface Branding {
  logo: File | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

export interface OnboardingStepData {
  userInfo: UserInfo;
  companyInfo: CompanyInfo;
  branding: Branding;
  enabledSections: string[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
}

// Constants
export const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
] as const;

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Food & Beverage",
  "Professional Services",
  "Construction",
  "Other",
] as const;
