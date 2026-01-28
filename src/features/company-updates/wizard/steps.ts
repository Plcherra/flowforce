import { CheckCircle, FileText } from "lucide-react";

import type { WizardStepMeta } from "./types";

export const WIZARD_STEPS: ReadonlyArray<WizardStepMeta> = [
  {
    id: "template",
    name: "Template",
    description: "Select a starting point or begin from scratch.",
    icon: FileText,
  },
  {
    id: "design",
    name: "Design & Content",
    description: "Craft the core message, visuals, and attachments.",
    icon: FileText,
  },
  {
    id: "recipients",
    name: "Recipients",
    description: "Choose who should receive this update.",
    icon: FileText,
  },
  {
    id: "publish",
    name: "Publish Settings",
    description: "Schedule delivery and engagement options.",
    icon: FileText,
  },
  {
    id: "summary",
    name: "Summary",
    description: "Review details before publishing.",
    icon: CheckCircle,
  },
] as const;
