
import {
  Building2,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  DollarSign,
  BarChart3,
  Settings,
  UserPlus,
  User,
  Shield,
  Crown,
  Brain,
  BookOpen,
  Star,
  TrendingUp,
  UserCheck,
  Layers,
  Award,
  Target,
  Package,
  Receipt,
  CreditCard,
  FileText,
  ShoppingCart,
  Calculator,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
  permission?: string;
  translationKey: string;
  featureFlag?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
  roles?: string[];
  permission?: string;
  translationKey: string;
}

export const navigationSections: NavigationSection[] = [
  {
    title: "Communication",
    translationKey: "communication",
    items: [
      { name: 'Messages', href: '/messages', icon: MessageSquare, translationKey: 'messages' },
  { name: 'Events', href: '/events', icon: Calendar, translationKey: 'events' },
    ]
  },
  {
    title: "Operations",
    translationKey: "operations", 
    items: [
      { name: 'Goals', href: '/goals', icon: Target, translationKey: 'goals' },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, translationKey: 'tasks' },
      { name: 'Forms', href: '/forms', icon: CheckSquare, translationKey: 'forms' },
      { name: 'Scheduling', href: '/scheduling', icon: Calendar, translationKey: 'scheduling' },
    ]
  },
  {
    title: "HR & Development",
    translationKey: "hrDevelopment",
    items: [
      { name: 'AI Insights', href: '/ai-insights', icon: Brain, translationKey: 'aiInsights' },
      { name: 'Learning Center', href: '/learning', icon: BookOpen, translationKey: 'learning' },
      { name: 'Certifications', href: '/certifications', icon: Award, translationKey: 'certifications' },
      { name: 'Recognition', href: '/recognition', icon: Star, translationKey: 'recognition' },
      { name: 'Performance', href: '/performance', icon: TrendingUp, roles: ['supervisor', 'manager', 'company_admin'], translationKey: 'performance' },
    ]
  },
  {
    title: "Inventory",
    translationKey: "inventory",
    items: [
      { name: 'Dashboard', href: '/inventory', icon: Package, permission: 'inventory.view', translationKey: 'inventoryDashboard' },
      { name: 'Cookbook', href: '/inventory/cookbook', icon: BookOpen, permission: 'inventory.view', translationKey: 'cookbook', featureFlag: 'inventory.cookbook' },
      { name: 'Items & Setup', href: '/inventory/items', icon: Package, permission: 'inventory.view', translationKey: 'itemsSetup' },
      { name: 'Counts', href: '/inventory/counts', icon: Receipt, permission: 'inventory.counts.view', translationKey: 'inventoryCounts' },
      { name: 'Prep & PAR', href: '/inventory/prep', icon: Calculator, permission: 'inventory.prep.view', translationKey: 'dailyPrep' },
      { name: 'Purchasing', href: '/inventory/purchasing', icon: ShoppingCart, permission: 'inventory.purchasing.view', roles: ['supervisor', 'manager', 'company_admin'], translationKey: 'purchasing' },
      { name: 'Waste & Actions', href: '/inventory/actions', icon: Calculator, permission: 'inventory.waste.view', translationKey: 'inventoryActions' },
      { name: 'Reports', href: '/inventory/reports', icon: FileText, permission: 'reports.view', roles: ['supervisor', 'manager', 'company_admin'], translationKey: 'inventoryReports' },
    ]
  },
  {
    title: "Accounting",
    translationKey: "accounting",
    roles: ['supervisor', 'manager', 'company_admin'],
    items: [
      { name: 'Expenses', href: '/expenses', icon: DollarSign, translationKey: 'expenses' },
      { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['supervisor', 'manager', 'company_admin'], translationKey: 'payments' },
      { name: 'Invoices', href: '/invoices', icon: FileText, roles: ['supervisor', 'manager', 'company_admin'], translationKey: 'invoices' },
      { name: 'Cost Analysis', href: '/cost-analysis', icon: Calculator, roles: ['manager', 'company_admin'], translationKey: 'costAnalysis' },
    ]
  },
  {
    title: "Analytics & Reports",
    translationKey: "analyticsReports",
    roles: ['supervisor', 'manager', 'company_admin'],
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['supervisor', 'manager', 'company_admin'], translationKey: 'analytics' },
      { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['manager', 'company_admin'], translationKey: 'reports' },
    ]
  },
  {
    title: "Admin & Setup",
    translationKey: "adminSetup",
    roles: ['manager', 'admin', 'company_admin', 'owner'],
    items: [
      { name: 'User Management', href: '/admin', icon: UserCheck, roles: ['admin', 'company_admin', 'owner'], translationKey: 'userManagement' },
      { name: 'Employees', href: '/employees', icon: Users, roles: ['manager', 'admin', 'company_admin', 'owner'], translationKey: 'employees' },
      { name: 'Invite Employee', href: '/invite-employee', icon: UserPlus, roles: ['admin', 'company_admin', 'owner'], translationKey: 'inviteEmployee' },
      { name: 'Sections & Permissions', href: '/sections-permissions', icon: Layers, roles: ['company_admin', 'owner'], translationKey: 'sectionsPermissions' },
      { name: 'System Settings', href: '/settings', icon: Settings, roles: ['admin', 'company_admin', 'owner'], translationKey: 'systemSettings' },
    ]
  }
];

export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner': return 'bg-purple-100 text-purple-800';
    case 'company_admin': return 'bg-red-100 text-red-800';
    case 'admin': return 'bg-red-100 text-red-800';
    case 'manager': return 'bg-blue-100 text-blue-800';
    case 'supervisor': return 'bg-green-100 text-green-800';
    case 'staff': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getRoleIcon = (role: string) => {
  switch (role) {
    case 'owner': return <Crown className="h-3 w-3" />;
    case 'company_admin': return <Crown className="h-3 w-3" />;
    case 'admin': return <Crown className="h-3 w-3" />;
    case 'manager': return <Shield className="h-3 w-3" />;
    case 'supervisor': return <UserCheck className="h-3 w-3" />;
    case 'staff': return <User className="h-3 w-3" />;
    default: return <User className="h-3 w-3" />;
  }
};

export const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner': return 'Owner';
    case 'company_admin': return 'Company Admin';
    case 'admin': return 'Admin';
    case 'manager': return 'Manager';
    case 'supervisor': return 'Supervisor';
    case 'staff': return 'Staff';
    default: return 'Staff';
  }
};
