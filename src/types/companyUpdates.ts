import type {
  BackgroundStyle,
  PublishingSettings,
  UpdateRecipient,
} from "@/types/updateTemplates";

export type CompanyUpdateRow = {
  id: string;
  company_id: string;
  title: string;
  body: string;
  rich_content?: string | null;
  update_type: string;
  priority: string;
  status: string;
  background_style?: unknown;
  recipients?: unknown;
  publishing_settings?: unknown;
  assigned_employees?: string[] | null;
  author_id?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  author_avatar?: string | null;
  publish_date?: string | null;
  scheduled_date?: string | null;
  is_pinned: boolean;
  likes_count?: number | null;
  comments_count?: number | null;
  views_count?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyUpdateType = "announcement" | "news" | "event" | "policy";
export type CompanyUpdatePriority = "high" | "medium" | "low";
export type CompanyUpdateStatus =
  | "published"
  | "draft"
  | "scheduled"
  | "archived";

export interface CompanyUpdate {
  id: string;
  companyId: string;
  title: string;
  body: string;
  richContent?: string | null;
  type: CompanyUpdateType;
  priority: CompanyUpdatePriority;
  status: CompanyUpdateStatus;
  backgroundStyle?: BackgroundStyle | null;
  recipients?: UpdateRecipient | null;
  publishingSettings?: PublishingSettings | null;
  assignedEmployees: string[];
  author: {
    id: string | null;
    name: string;
    avatar?: string | null;
    role?: string | null;
  };
  publishDate: string;
  scheduledDate?: string | null;
  isPinned: boolean;
  likes: number;
  comments: number;
  views: number;
  viewerHasLiked: boolean;
  viewerHasViewed: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  engagement?: {
    engagementScore?: number | null;
    aiSummary?: string | null;
    lastAnalyzed?: string | null;
  } | null;
}

export type CompanyUpdateCardView = CompanyUpdate & {
  showActions?: boolean;
};

export interface UpdateComment {
  id: string;
  updateId: string;
  companyId: string;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  content: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateCompanyUpdateInput = {
  title: string;
  body: string;
  richContent?: string | null;
  type: CompanyUpdateType;
  priority: CompanyUpdatePriority;
  backgroundStyle?: BackgroundStyle | null;
  publishingSettings?: PublishingSettings | null;
  recipients?: UpdateRecipient | null;
  assignedEmployees?: string[];
  isPinned?: boolean;
};
