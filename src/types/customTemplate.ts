export interface CustomPage {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  content: CustomPageContent[];
  permissions: string[];
  isActive: boolean;
}

export interface CustomPageContent {
  id: string;
  type: 'text' | 'form' | 'chart' | 'table' | 'image' | 'video' | 'calendar' | 'kanban';
  title: string;
  content: unknown; // Flexible content based on type (JSON)
  position: { x: number; y: number; width: number; height: number };
  styling: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: number;
    padding?: number;
    margin?: number;
  };
}

export interface CustomSection {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'communication' | 'operations' | 'hr' | 'analytics' | 'admin' | 'custom' | 'other' | string;
  pages: CustomPage[];
  permissions: string[];
  isDefault: boolean;
  isActive: boolean;
}

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  companySize: string[];
  branding: CustomBranding;
  sections: CustomSection[];
  defaultRoles: CustomRole[];
  suggestedPositions: CustomPosition[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: 'modern' | 'classic' | 'minimal' | 'bold';
  sidebarStyle: 'expanded' | 'collapsed' | 'floating';
  cardStyle: 'rounded' | 'sharp' | 'elevated';
  backgroundPattern?: 'none' | 'dots' | 'lines' | 'gradient';
  customCSS?: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchyLevel: number;
  permissions: Record<string, boolean>;
  isSystemRole: boolean;
}

export interface CustomPosition {
  id: string;
  name: string;
  description: string;
  roleId: string;
  department?: string;
  permissions: Record<string, boolean>;
}