import {
  MessageSquare,
  CalendarDays,
  Video,
  Megaphone,
  Target,
  CheckSquare,
  FileText,
  CalendarRange,
  Brain,
  TrendingUp,
  CalendarClock,
  CalendarCheck,
  Star,
  Award,
  BookOpen,
  Calculator,
  Receipt,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  ClipboardCheck,
  UserCheck,
  Users,
  UserPlus,
  User,
  Layers,
  Settings,
  Shield,
  Crown,
  Trophy,
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
    title: 'Communication',
    translationKey: 'communication',
    items: [
      { name: 'Messages', href: '/messages', icon: MessageSquare, translationKey: 'messages' },
      { name: 'Events & Meetings', href: '/calendar', icon: CalendarDays, translationKey: 'calendar' },
      { name: 'Company Updates', href: '/company-updates', icon: Megaphone, translationKey: 'companyUpdates' },
    ],
  },
  {
    title: 'Operations',
    translationKey: 'operations',
    items: [
      { name: 'Goals', href: '/goals', icon: Target, translationKey: 'goals' },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, translationKey: 'tasks' },
      { name: 'Forms', href: '/forms', icon: FileText, translationKey: 'forms' },
      { name: 'Scheduling', href: '/enhanced-scheduling', icon: CalendarRange, translationKey: 'scheduling' },
      { name: 'My Availability', href: '/enhanced-scheduling?tab=availability', icon: CalendarCheck, translationKey: 'myAvailability' },
      {
        name: 'Manage Availability',
        href: '/enhanced-scheduling?tab=availability&availability=team',
        icon: ClipboardCheck,
        translationKey: 'manageAvailability',
        roles: ['manager', 'admin', 'company_admin', 'owner'],
      },
    ],
  },
  {
    title: 'HR & Development',
    translationKey: 'hrDevelopment',
    items: [
      { name: 'AI Insights', href: '/ai-insights', icon: Brain, translationKey: 'aiInsights' },
      { name: 'Performance', href: '/performance', icon: TrendingUp, translationKey: 'performance', roles: ['supervisor', 'manager', 'company_admin'] },
      { name: 'Time Off', href: '/time-off', icon: CalendarClock, translationKey: 'timeOff' },
      { name: 'Recognition', href: '/recognition', icon: Star, translationKey: 'recognition' },
      { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, translationKey: 'leaderboard' },
      { name: 'Certifications', href: '/certifications', icon: Award, translationKey: 'certifications' },
      { name: 'Learning Center', href: '/learning-center', icon: BookOpen, translationKey: 'learning' },
    ],
  },
  {
    title: 'Inventory',
    translationKey: 'inventory',
    items: [
      { name: 'Inventory Actions', href: '/inventory-actions', icon: Calculator, translationKey: 'inventoryActions' },
      { name: 'Inventory Count Execution', href: '/inventory-count-execution', icon: Receipt, translationKey: 'inventoryCountExecution' },
      { name: 'Items & Setup', href: '/items-setup', icon: Package, translationKey: 'itemsSetup' },
      { name: 'Purchasing', href: '/purchasing', icon: ShoppingCart, translationKey: 'purchasing' },
      { name: 'Cookbook', href: '/cookbook', icon: BookOpen, translationKey: 'cookbook' },
    ],
  },
  {
    title: 'Accounting',
    translationKey: 'accounting',
    items: [
      { name: 'Expenses', href: '/expenses', icon: DollarSign, translationKey: 'expenses' },
    ],
  },
  {
    title: 'Analytics & Reports',
    translationKey: 'analyticsReports',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3, translationKey: 'analytics' },
      { name: 'Reports', href: '/reports', icon: FileText, translationKey: 'reports' },
    ],
  },
  {
    title: 'Admin & Setup',
    translationKey: 'adminSetup',
    roles: ['manager', 'admin', 'company_admin', 'owner'],
    items: [
      { name: 'User Management', href: '/admin', icon: UserCheck, translationKey: 'userManagement', roles: ['admin', 'company_admin', 'owner'] },
      { name: 'Employees', href: '/employees', icon: Users, translationKey: 'employees', roles: ['manager', 'admin', 'company_admin', 'owner'] },
      { name: 'Invite Employee', href: '/employees?invite=1', icon: UserPlus, translationKey: 'inviteEmployee', roles: ['admin', 'company_admin', 'owner'] },
      { name: 'Team Management', href: '/position-management', icon: User, translationKey: 'positionManagement', roles: ['manager', 'admin', 'company_admin', 'owner'] },
      { name: 'Sections & Permissions', href: '/sections-permissions', icon: Layers, translationKey: 'sectionsPermissions', roles: ['company_admin', 'owner'] },
      { name: 'System Settings', href: '/settings', icon: Settings, translationKey: 'systemSettings', roles: ['admin', 'company_admin', 'owner'] },
    ],
  },
];

export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800';
    case 'company_admin':
      return 'bg-red-100 text-red-800';
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'manager':
      return 'bg-blue-100 text-blue-800';
    case 'supervisor':
      return 'bg-green-100 text-green-800';
    case 'staff':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getRoleIcon = (role: string) => {
  switch (role) {
    case 'owner':
      return <Crown className="h-3 w-3" />;
    case 'company_admin':
      return <Crown className="h-3 w-3" />;
    case 'admin':
      return <Crown className="h-3 w-3" />;
    case 'manager':
      return <Shield className="h-3 w-3" />;
    case 'supervisor':
      return <UserCheck className="h-3 w-3" />;
    case 'staff':
      return <User className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
};

export const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'company_admin':
      return 'Company Admin';
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'supervisor':
      return 'Supervisor';
    case 'staff':
      return 'Staff';
    default:
      return 'Staff';
  }
};
