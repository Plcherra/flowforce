
import { BusinessTemplate } from '@/types/templates';

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'restaurant',
    name: 'Restaurant & Food Service',
    description: 'Complete solution for restaurants, cafes, and food service operations with shift management, role-based access, and inventory tracking.',
    industry: 'restaurant',
    icon: 'Utensils',
    sections: [
      'dashboard',
      'scheduling',
      'shift-management',
      'staff-roles',
      'inventory',
      'tasks',
      'messages',
      'expenses',
      'time-tracking',
      'performance',
      'forms',
      'analytics',
      'reports',
      'learning',
      'certifications',
      'recognition'
    ],
    defaultRoles: ['staff', 'server', 'chef', 'shift-supervisor', 'manager', 'company_admin'],
    customFields: {
      shifts: ['morning', 'afternoon', 'evening', 'night'],
      positions: ['server', 'bartender', 'chef', 'prep-cook', 'dishwasher', 'host'],
      stations: ['front-of-house', 'back-of-house', 'bar', 'kitchen']
    },
    suggestedPositions: {
      'employee': ['Server', 'Dishwasher', 'Host/Hostess', 'Busser'],
      'supervisor': ['Shift Supervisor', 'Head Server', 'Kitchen Supervisor'],
      'manager': ['Assistant Manager', 'Kitchen Manager', 'Front of House Manager'],
      'admin': ['General Manager', 'Owner', 'Regional Manager']
    }
  },
  {
    id: 'office',
    name: 'Office & Professional Services',
    description: 'Perfect for consulting firms, professional services, and office-based businesses focusing on project management and collaboration.',
    industry: 'professional',
    icon: 'Briefcase',
    sections: [
      'dashboard',
      'projects',
      'tasks',
      'documents',
      'messages',
      'calendar',
      'expenses',
      'reports',
      'performance',
      'learning',
      'forms',
      'analytics',
      'certifications',
      'recognition',
      'time-tracking'
    ],
    defaultRoles: ['staff', 'supervisor', 'manager', 'company_admin'],
    customFields: {
      projectTypes: ['consulting', 'development', 'analysis', 'research'],
      clientCategories: ['enterprise', 'small-business', 'nonprofit'],
      serviceAreas: ['strategy', 'operations', 'technology', 'finance']
    },
    suggestedPositions: {
      'staff': ['Junior Developer', 'Analyst', 'Coordinator', 'Specialist'],
      'supervisor': ['Senior Developer', 'Team Lead', 'Project Coordinator'],
      'manager': ['Project Manager', 'Department Head', 'Account Manager'],
      'admin': ['Director', 'VP', 'CTO', 'CEO']
    }
  },
  {
    id: 'retail',
    name: 'Retail & Commerce',
    description: 'Designed for retail stores, e-commerce businesses with inventory management, sales tracking, and customer service features.',
    industry: 'retail',
    icon: 'ShoppingCart',
    sections: [
      'dashboard',
      'inventory',
      'sales',
      'scheduling',
      'customer-service',
      'tasks',
      'expenses',
      'analytics',
      'staff-training',
      'recognition',
      'forms',
      'reports',
      'learning',
      'certifications',
      'time-tracking'
    ],
    defaultRoles: ['staff', 'sales-associate', 'supervisor', 'manager', 'company_admin'],
    customFields: {
      departments: ['electronics', 'clothing', 'home-goods', 'groceries'],
      salesChannels: ['in-store', 'online', 'phone', 'mobile-app'],
      customerTypes: ['retail', 'wholesale', 'vip', 'loyalty-member']
    },
    suggestedPositions: {
      'staff': ['Sales Associate', 'Cashier', 'Stock Clerk', 'Customer Service Rep'],
      'supervisor': ['Floor Supervisor', 'Department Lead', 'Shift Leader'],
      'manager': ['Store Manager', 'Department Manager', 'Assistant Manager'],
      'admin': ['District Manager', 'Regional Manager', 'Operations Director']
    }
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Medical',
    description: 'Tailored for healthcare facilities, clinics, and medical practices with compliance, scheduling, and certification tracking.',
    industry: 'healthcare',
    icon: 'Heart',
    sections: [
      'dashboard',
      'scheduling',
      'patient-management',
      'compliance',
      'certifications',
      'forms',
      'messages',
      'learning',
      'analytics',
      'audit-logs',
      'reports',
      'tasks',
      'time-tracking',
      'recognition'
    ],
    defaultRoles: ['staff', 'nurse', 'practitioner', 'supervisor', 'manager', 'company_admin'],
    customFields: {
      specialties: ['general', 'pediatrics', 'cardiology', 'orthopedics'],
      certifications: ['cpr', 'first-aid', 'specialized-training'],
      complianceAreas: ['hipaa', 'safety', 'quality-assurance']
    },
    suggestedPositions: {
      'staff': ['Medical Assistant', 'Receptionist', 'File Clerk', 'Technician'],
      'nurse': ['RN', 'LPN', 'Nurse Practitioner', 'Charge Nurse'],
      'practitioner': ['Doctor', 'Physician Assistant', 'Specialist', 'Surgeon'],
      'supervisor': ['Head Nurse', 'Department Supervisor', 'Clinic Coordinator'],
      'manager': ['Clinic Manager', 'Medical Director', 'Department Head'],
      'admin': ['Administrator', 'Chief Medical Officer', 'Executive Director']
    }
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Production',
    description: 'Built for manufacturing facilities with production tracking, safety management, and quality control.',
    industry: 'manufacturing',
    icon: 'Cog',
    sections: [
      'dashboard',
      'production',
      'quality-control',
      'safety',
      'scheduling',
      'inventory',
      'maintenance',
      'tasks',
      'analytics',
      'compliance',
      'forms',
      'reports',
      'learning',
      'certifications',
      'recognition',
      'time-tracking'
    ],
    defaultRoles: ['operator', 'technician', 'supervisor', 'manager', 'company_admin'],
    customFields: {
      productLines: ['assembly', 'packaging', 'quality-testing'],
      safetyProtocols: ['ppe-required', 'hazmat', 'machinery-safety'],
      shiftTypes: ['day', 'swing', 'night', 'weekend']
    },
    suggestedPositions: {
      'operator': ['Machine Operator', 'Assembly Worker', 'Packer', 'Quality Inspector'],
      'technician': ['Maintenance Technician', 'QC Technician', 'Setup Technician'],
      'supervisor': ['Shift Supervisor', 'Production Supervisor', 'Maintenance Supervisor'],
      'manager': ['Production Manager', 'Plant Manager', 'Operations Manager'],
      'admin': ['Plant Director', 'VP Operations', 'General Manager']
    }
  }
];
