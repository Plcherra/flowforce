import type { BackgroundStyle, PublishingSettings, UpdateRecipient } from '@/types/updateTemplates';
import type { Tables } from '@/integrations/supabase/public-types';

export type CompanyUpdateRow = Tables<'company_updates'>;

export type CompanyUpdateType = 'announcement' | 'news' | 'event' | 'policy';
export type CompanyUpdatePriority = 'high' | 'medium' | 'low';
export type CompanyUpdateStatus = 'published' | 'draft' | 'scheduled' | 'archived';

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
