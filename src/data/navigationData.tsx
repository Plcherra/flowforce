import {
  BarChart3,
  Calculator,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  Crown,
  DollarSign,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
  User,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";

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
    title: "Daily Operations",
    translationKey: "dailyOperations",
    items: [
      {
        name: "Scheduling",
        href: "/app/enhanced-scheduling",
        icon: CalendarRange,
        translationKey: "scheduling",
      },
      {
        name: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        translationKey: "tasks",
      },
      {
        name: "Messages",
        href: "/messages",
        icon: MessageSquare,
        translationKey: "messages",
      },
      {
        name: "Company Updates",
        href: "/company-updates",
        icon: Megaphone,
        translationKey: "companyUpdates",
      },
      {
        name: "Forms",
        href: "/forms",
        icon: FileText,
        translationKey: "forms",
      },
      {
        name: "Operations",
        href: "/operations",
        icon: Wrench,
        translationKey: "operationsIntelligence",
      },
      {
        name: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        translationKey: "calendar",
      },
    ],
  },
  {
    title: "Inventory & Cost",
    translationKey: "inventory",
    items: [
      {
        name: "Inventory",
        href: "/inventory",
        icon: Calculator,
        translationKey: "inventory",
      },
      {
        name: "Expenses",
        href: "/expenses",
        icon: DollarSign,
        translationKey: "expenses",
      },
    ],
  },
  {
    title: "Reports & Intelligence",
    translationKey: "analyticsReports",
    items: [
      {
        name: "Reports",
        href: "/reports",
        icon: FileText,
        translationKey: "reports",
      },
      {
        name: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        translationKey: "analytics",
      },
      {
        name: "AI Insights",
        href: "/ai-insights",
        icon: Sparkles,
        translationKey: "aiInsights",
      },
    ],
  },
  {
    title: "Team & HR",
    translationKey: "team",
    items: [
      {
        name: "Team Directory",
        href: "/employees",
        icon: Users,
        translationKey: "employees",
      },
      {
        name: "Performance",
        href: "/performance",
        icon: Target,
        translationKey: "performance",
      },
      {
        name: "Recognition",
        href: "/recognition",
        icon: Trophy,
        translationKey: "recognition",
      },
      {
        name: "Leaderboard",
        href: "/leaderboard",
        icon: Trophy,
        translationKey: "leaderboard",
      },
      {
        name: "Learning Center",
        href: "/learning-center",
        icon: GraduationCap,
        translationKey: "learning",
      },
      {
        name: "Certifications",
        href: "/certifications",
        icon: GraduationCap,
        translationKey: "certifications",
      },
    ],
  },
  {
    title: "Administration",
    translationKey: "adminSetup",
    items: [
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        translationKey: "settings",
      },
      {
        name: "Admin",
        href: "/admin",
        icon: Shield,
        translationKey: "admin",
      },
      {
        name: "Resources",
        href: "/resources",
        icon: FileText,
        translationKey: "reports",
      },
    ],
  },
];

const normalizeRole = (role: string) => role.trim().toLowerCase();

export const getRoleBadgeColor = (role: string) => {
  switch (normalizeRole(role)) {
    case "owner":
      return "bg-purple-100 text-purple-800";
    case "company_admin":
    case "administrator":
      return "bg-red-100 text-red-800";
    case "admin":
      return "bg-red-100 text-red-800";
    case "manager":
      return "bg-blue-100 text-blue-800";
    case "supervisor":
      return "bg-green-100 text-green-800";
    case "staff":
    case "employee":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getRoleIcon = (role: string) => {
  switch (normalizeRole(role)) {
    case "owner":
      return <Crown className="h-3 w-3" />;
    case "company_admin":
    case "administrator":
      return <Crown className="h-3 w-3" />;
    case "admin":
      return <Crown className="h-3 w-3" />;
    case "manager":
      return <Shield className="h-3 w-3" />;
    case "supervisor":
      return <UserCheck className="h-3 w-3" />;
    case "staff":
    case "employee":
      return <User className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
};

export const getRoleLabel = (role: string) => {
  switch (normalizeRole(role)) {
    case "owner":
      return "Owner";
    case "company_admin":
      return "Company Admin";
    case "administrator":
      return "Administrator";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "supervisor":
      return "Supervisor";
    case "staff":
      return "Staff";
    case "employee":
      return "Employee";
    default:
      return "Staff";
  }
};
