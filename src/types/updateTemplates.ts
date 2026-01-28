export interface UpdateTemplate {
  id: string;
  name: string;
  description: string;
  type: "announcement" | "news" | "event" | "policy";
  preview: string;
  backgroundStyle: BackgroundStyle;
  defaultContent?: string;
  defaultTitle?: string;
}

export interface BackgroundStyle {
  type: "solid" | "gradient" | "pattern";
  primary: string;
  secondary?: string;
  pattern?: "dots" | "lines" | "grid" | "waves" | "none";
}

export interface UpdateRecipient {
  type: "all" | "departments" | "roles" | "individuals" | "groups";
  targets: string[];
  count?: number;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  reminders: boolean;
  reminderInterval?: number; // hours
}

export interface EngagementSettings {
  allowLikes: boolean;
  allowComments: boolean;
  allowSharing: boolean;
  requireConfirmation: boolean;
  showAsPopup: boolean;
}

export interface PublishingSettings {
  publishNow: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  timezone?: string;
  notifications: NotificationSettings;
  engagement: EngagementSettings;
  authorAttribution: boolean;
  authorName?: string;
}

export interface EnhancedCompanyUpdate {
  id: string;
  title: string;
  content: string;
  richContent?: string;
  type: "announcement" | "news" | "event" | "policy";
  priority: "high" | "medium" | "low";
  status: "published" | "draft" | "scheduled" | "archived";
  templateId?: string;
  backgroundStyle: BackgroundStyle;
  recipients: UpdateRecipient;
  publishingSettings: PublishingSettings;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  publishDate: string;
  scheduledDate?: string;
  isPinned: boolean;
  likes: number;
  comments: number;
  views: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
