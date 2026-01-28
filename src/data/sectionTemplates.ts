export interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  config: {
    path: string;
    permissions: string[];
    pages?: {
      name: string;
      title: string;
      icon: string;
      route: string;
      content: any[];
      permissions: string[];
    }[];
  };
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
  // Communication Templates
  {
    id: "company-updates",
    name: "Company Updates",
    description: "Company announcements and news",
    icon: "📢",
    category: "communication",
    config: {
      path: "/updates",
      permissions: ["viewOwnProfile"],
      pages: [
        {
          name: "announcements",
          title: "Announcements",
          icon: "Bell",
          route: "/updates/announcements",
          content: [],
          permissions: ["viewOwnProfile"],
        },
        {
          name: "news",
          title: "Company News",
          icon: "Newspaper",
          route: "/updates/news",
          content: [],
          permissions: ["viewOwnProfile"],
        },
        {
          name: "events",
          title: "Upcoming Events",
          icon: "Calendar",
          route: "/updates/events",
          content: [],
          permissions: ["viewOwnProfile"],
        },
      ],
    },
  },
  {
    id: "employee-directory",
    name: "Employee Directory",
    description: "Staff contact information and org chart",
    icon: "Users",
    category: "communication",
    config: {
      path: "/directory",
      permissions: ["viewTeamProfiles"],
      pages: [
        {
          name: "contacts",
          title: "Employee Contacts",
          icon: "ContactRound",
          route: "/directory/contacts",
          content: [],
          permissions: ["viewTeamProfiles"],
        },
      ],
    },
  },
  // Events calendar template removed (managed by canonical /events page)
  {
    id: "knowledge-base",
    name: "Knowledge Base",
    description: "Company knowledge and documentation",
    icon: "BookOpen",
    category: "communication",
    config: {
      path: "/knowledge",
      permissions: ["viewOwnProfile"],
      pages: [
        {
          name: "docs",
          title: "Documentation",
          icon: "FileText",
          route: "/knowledge/docs",
          content: [],
          permissions: ["viewOwnProfile"],
        },
        {
          name: "faqs",
          title: "FAQs",
          icon: "HelpCircle",
          route: "/knowledge/faqs",
          content: [],
          permissions: ["viewOwnProfile"],
        },
      ],
    },
  },
  {
    id: "help-desk",
    name: "Help Desk",
    description: "Support tickets and IT requests",
    icon: "Headphones",
    category: "communication",
    config: {
      path: "/app/help-desk",
      permissions: ["viewOwnProfile"],
      pages: [
        {
          name: "tickets",
          title: "Support Tickets",
          icon: "Ticket",
          route: "/app/help-desk",
          content: [],
          permissions: ["viewOwnProfile"],
        },
      ],
    },
  },

  // Operations Templates
  {
    id: "job-scheduling",
    name: "Job Scheduling",
    description: "Schedule jobs and assignments",
    icon: "Calendar",
    category: "operations",
    config: {
      path: "/job-scheduling",
      permissions: ["viewOwnSchedules"],
      pages: [
        {
          name: "schedule",
          title: "Job Schedule",
          icon: "CalendarClock",
          route: "/job-scheduling/schedule",
          content: [],
          permissions: ["viewOwnSchedules"],
        },
      ],
    },
  },

  // HR Templates
  {
    id: "performance-reviews",
    name: "Performance Reviews",
    description: "Employee performance evaluations",
    icon: "Target",
    category: "hr",
    config: {
      path: "/performance-reviews",
      permissions: ["viewTeamProfiles"],
      pages: [
        {
          name: "reviews",
          title: "Performance Reviews",
          icon: "ClipboardCheck",
          route: "/performance-reviews/reviews",
          content: [],
          permissions: ["viewTeamProfiles"],
        },
      ],
    },
  },
  {
    id: "time-off-requests",
    name: "Time Off Requests",
    description: "Vacation and leave management",
    icon: "Plane",
    category: "hr",
    config: {
      path: "/scheduling/timeoff",
      permissions: ["viewOwnProfile"],
      pages: [
        {
          name: "requests",
          title: "Time Off Requests",
          icon: "CalendarX",
          route: "/scheduling/timeoff",
          content: [],
          permissions: ["viewOwnProfile"],
        },
      ],
    },
  },
  {
    id: "employee-recognition",
    name: "Employee Recognition",
    description: "Recognition and rewards program",
    icon: "Star",
    category: "hr",
    config: {
      path: "/employee-recognition",
      permissions: ["viewOwnProfile"],
      pages: [
        {
          name: "awards",
          title: "Awards & Recognition",
          icon: "Award",
          route: "/employee-recognition/awards",
          content: [],
          permissions: ["viewOwnProfile"],
        },
      ],
    },
  },
];

export const getTemplatesByCategory = (category: string) => {
  return QUICK_TEMPLATES.filter((template) => template.category === category);
};
