import type { PublishingSettings, UpdateRecipient } from '@/types/updateTemplates';

export interface CompanyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'news' | 'event' | 'policy';
  priority: 'high' | 'medium' | 'low';
  status: 'published' | 'draft' | 'scheduled' | 'archived';
  backgroundStyle?: {
    type: 'solid' | 'gradient' | 'pattern';
    primary: string;
    secondary?: string;
    pattern?: string;
  };
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
  viewerHasLiked?: boolean;
  assignedEmployees: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  richContent?: string;
  publishingSettings?: PublishingSettings;
  recipients?: UpdateRecipient;
}

export interface UpdateComment {
  id: string;
  updateId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  likes: number;
}

export interface UpdateEngagement {
  updateId: string;
  userId: string;
  type: 'like' | 'view';
  createdAt: string;
}
