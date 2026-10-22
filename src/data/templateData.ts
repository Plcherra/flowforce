import { Store, UtensilsCrossed, Heart } from "lucide-react";

export const templates = {
  retail: {
    icon: Store,
    title: "Retail Template",
    description:
      "Streamline your retail operations with specialized tools for inventory, scheduling, and customer service.",
    color: "text-primary",
    bgColor: "bg-primary",
    gradient: "from-primary to-primary",
    features: [
      "Shift coverage alerts",
      "Sales performance tracking",
      "Inventory automation",
      "POS integration",
      "Customer feedback management",
      "Multi-location support",
    ],
    modules: [
      {
        name: "Employee Scheduling",
        description: "Optimize floor coverage during peak hours",
      },
      {
        name: "Inventory Management",
        description: "Track stock levels and automate reorders",
      },
      {
        name: "Sales Analytics",
        description: "Monitor performance across locations",
      },
      {
        name: "Task Management",
        description: "Daily opening/closing checklists",
      },
    ],
  },
  hospitality: {
    icon: UtensilsCrossed,
    title: "Hospitality Template",
    description:
      "Enhance guest experiences with coordinated front-of-house and back-of-house operations.",
    color: "text-warning",
    bgColor: "bg-warning",
    gradient: "from-warning to-destructive",
    features: [
      "Kitchen display systems",
      "Server scheduling",
      "Guest feedback tracking",
      "Table management",
      "Menu updates",
      "Staff communication",
    ],
    modules: [
      {
        name: "Table Management",
        description: "Coordinate seating and service flow",
      },
      {
        name: "Kitchen Operations",
        description: "Order tracking and preparation times",
      },
      {
        name: "Staff Coordination",
        description: "Front and back-of-house communication",
      },
      {
        name: "Guest Services",
        description: "Feedback collection and response",
      },
    ],
  },
  healthcare: {
    icon: Heart,
    title: "Healthcare Template",
    description:
      "Ensure patient care excellence with compliance-focused scheduling and documentation.",
    color: "text-success",
    bgColor: "bg-success",
    gradient: "from-success to-success",
    features: [
      "HIPAA compliance",
      "Patient flow tracking",
      "Certification alerts",
      "Shift handoffs",
      "Equipment tracking",
      "Emergency protocols",
    ],
    modules: [
      {
        name: "Patient Care Coordination",
        description: "Track patient assignments and care plans",
      },
      {
        name: "Compliance Management",
        description: "Certification tracking and renewals",
      },
      {
        name: "Shift Handoffs",
        description: "Secure patient information transfer",
      },
      {
        name: "Emergency Response",
        description: "Rapid staff communication protocols",
      },
    ],
  },
};

export type TemplateKey = keyof typeof templates;
export type Template = (typeof templates)[TemplateKey];
