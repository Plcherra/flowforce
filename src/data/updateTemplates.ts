import { UpdateTemplate } from "@/types/updateTemplates";

export const UPDATE_TEMPLATES: UpdateTemplate[] = [
  {
    id: "announcement-general",
    name: "General Announcement",
    description: "Standard company-wide announcement template",
    type: "announcement",
    preview:
      "A clean, professional template for general company announcements.",
    backgroundStyle: {
      type: "gradient",
      primary: "#3b82f6",
      secondary: "#1e40af",
    },
    defaultTitle: "Important Company Announcement",
    defaultContent: "We have an exciting update to share with everyone...",
  },
  {
    id: "announcement-urgent",
    name: "Urgent Announcement",
    description: "High-priority urgent announcement template",
    type: "announcement",
    preview: "Eye-catching template for urgent company communications.",
    backgroundStyle: {
      type: "gradient",
      primary: "#dc2626",
      secondary: "#991b1b",
    },
    defaultTitle: "Urgent: Action Required",
    defaultContent:
      "This is an urgent announcement that requires immediate attention...",
  },
  {
    id: "news-company",
    name: "Company News",
    description: "Engaging template for company news and updates",
    type: "news",
    preview:
      "Modern template perfect for sharing company news and achievements.",
    backgroundStyle: {
      type: "gradient",
      primary: "#059669",
      secondary: "#047857",
    },
    defaultTitle: "Exciting Company News!",
    defaultContent:
      "We're thrilled to share some exciting news with our team...",
  },
  {
    id: "event-meeting",
    name: "Meeting & Events",
    description: "Template for meetings, events, and gatherings",
    type: "event",
    preview:
      "Professional template for event announcements and meeting invites.",
    backgroundStyle: {
      type: "gradient",
      primary: "#7c3aed",
      secondary: "#5b21b6",
    },
    defaultTitle: "Upcoming Event: [Event Name]",
    defaultContent: "Join us for an important event. Details below...",
  },
  {
    id: "policy-update",
    name: "Policy Update",
    description: "Formal template for policy changes and updates",
    type: "policy",
    preview: "Clean, authoritative template for policy communications.",
    backgroundStyle: {
      type: "solid",
      primary: "#374151",
    },
    defaultTitle: "Policy Update: [Policy Name]",
    defaultContent: "We are updating our company policy regarding...",
  },
  {
    id: "celebration",
    name: "Celebration",
    description: "Festive template for achievements and celebrations",
    type: "news",
    preview:
      "Vibrant template perfect for celebrating achievements and milestones.",
    backgroundStyle: {
      type: "pattern",
      primary: "#f59e0b",
      secondary: "#d97706",
      pattern: "dots",
    },
    defaultTitle: "🎉 Celebrating Our Success!",
    defaultContent:
      "Let's take a moment to celebrate this amazing achievement...",
  },
];

export const BACKGROUND_PATTERNS = [
  { id: "none", name: "None", preview: "Solid background" },
  { id: "dots", name: "Dots", preview: "Subtle dot pattern" },
  { id: "lines", name: "Lines", preview: "Diagonal line pattern" },
  { id: "grid", name: "Grid", preview: "Grid pattern" },
  { id: "waves", name: "Waves", preview: "Wave pattern" },
];

export const GRADIENT_PRESETS = [
  { name: "Ocean Blue", primary: "#3b82f6", secondary: "#1e40af" },
  { name: "Forest Green", primary: "#059669", secondary: "#047857" },
  { name: "Sunset Orange", primary: "#f59e0b", secondary: "#d97706" },
  { name: "Royal Purple", primary: "#7c3aed", secondary: "#5b21b6" },
  { name: "Cherry Red", primary: "#dc2626", secondary: "#991b1b" },
  { name: "Slate Gray", primary: "#64748b", secondary: "#475569" },
];
