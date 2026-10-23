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
    title: "Insights",
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
      {
        name: "Resources",
        href: "/resources",
        icon: FileText,
        translationKey: "resources",
      },
    ],
  },
];

const normalizeRole = (role: string) => role.trim().toLowerCase();

export const getRoleBadgeColor = (role: string) => {
  switch (normalizeRole(role)) {
    case "owner":
      return "bg-secondary/10 text-secondary";
    case "company_admin":
    case "administrator":
      return "bg-destructive/10 text-destructive";
    case "admin":
      return "bg-destructive/10 text-destructive";
    case "manager":
      return "bg-primary/10 text-primary";
    case "supervisor":
      return "bg-success-muted text-success";
    case "staff":
    case "employee":
      return "bg-muted text-foreground";
    default:
      return "bg-muted text-foreground";
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
