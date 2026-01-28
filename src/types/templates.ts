export interface BusinessTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon: string;
  sections: string[];
  defaultRoles?: string[];
  customFields?: Record<string, string | number | boolean | string[]>;
  suggestedPositions?: Record<string, string[]>; // role -> positions mapping
}

export interface CustomSection {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  component?: string;
  permissions: string[];
  enabled: boolean;
  order: number;
  category: "core" | "industry" | "custom" | "operations";
  templateId?: string;
}

export interface SectionCategory {
  id: string;
  name: string;
  description: string;
  sections: CustomSection[];
}

export interface OnboardingPosition {
  id: string;
  name: string;
  description: string;
  roleId: string;
  permissions: Record<string, boolean>;
  created_at?: string;
}
