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
    description: "Choose who can join this channel",
  },
  {
    id: 2,
    title: "Channel Details",
    icon: MessageSquare,
    description: "Set name and description",
  },
  {
    id: 3,
    title: "Channel Settings",
    icon: Settings,
    description: "Configure privacy and options",
  },
];

export const CHANNEL_TYPE_OPTIONS = [
  { value: "group", label: "Group Channel" },
  { value: "department", label: "Department Channel" },
  { value: "direct", label: "Direct Message" },
];
