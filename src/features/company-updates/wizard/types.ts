import type {
  UpdateRecipient,
  UpdateTemplate,
  BackgroundStyle,
  PublishingSettings,
} from "@/types/updateTemplates";
import type { LucideIcon } from "lucide-react";

export type WizardStepId =
  | "template"
  | "design"
  | "recipients"
  | "publish"
  | "summary";

export interface WizardStepMeta {
  id: WizardStepId;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface WizardFormData {
  template?: UpdateTemplate;
  title: string;
  body: string;
  bodyPlainText?: string;
  richContent?: string;
  type: "announcement" | "news" | "event" | "policy";
  priority: "high" | "medium" | "low";
  backgroundStyle: BackgroundStyle;
  recipients: UpdateRecipient;
  publishingSettings: PublishingSettings;
  category?: string;
  updateMedia: UpdateMediaItem[];
}

export interface UpdateMediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "file";
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  storagePath: string;
}

export interface CompanyUpdateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (data: WizardFormData) => void;
}
