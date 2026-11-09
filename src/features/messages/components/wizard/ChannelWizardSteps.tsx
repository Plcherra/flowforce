import { Users, MessageSquare, Settings } from "lucide-react";

export interface WizardStep {
  id: number;
  titleKey: string;
  icon: typeof Users;
  descriptionKey: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    titleKey: "messages.wizardAddPeople",
    icon: Users,
    descriptionKey: "messages.wizardAddPeopleHelp",
  },
  {
    id: 2,
    titleKey: "messages.wizardGroupDetails",
    icon: MessageSquare,
    descriptionKey: "messages.wizardGroupDetailsHelp",
  },
  {
    id: 3,
    titleKey: "messages.wizardPrivacy",
    icon: Settings,
    descriptionKey: "messages.wizardPrivacyHelp",
  },
];

export const CHANNEL_TYPE_OPTIONS = [
  { value: "group", label: "Group Channel" },
  { value: "department", label: "Department Channel" },
  { value: "direct", label: "Direct Message" },
];
