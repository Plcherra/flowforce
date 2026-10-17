import { Users, MessageSquare, Settings } from "lucide-react";

export interface WizardStep {
  id: number;
  title: string;
  icon: typeof Users;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "Add People",
    icon: Users,
    description: "Choose who is in this group",
  },
  {
    id: 2,
    title: "Group details",
    icon: MessageSquare,
    description: "Name the group",
  },
  {
    id: 3,
    title: "Privacy",
    icon: Settings,
    description: "Choose who can see it",
  },
];

export const CHANNEL_TYPE_OPTIONS = [
  { value: "group", label: "Group Channel" },
  { value: "department", label: "Department Channel" },
  { value: "direct", label: "Direct Message" },
];
