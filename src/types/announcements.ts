export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string;
  target_ids: any;
  created_by: string;
  company_id: string;
  expires_at?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  is_read?: boolean;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  priority?: string;
  target_audience?: string;
  target_ids?: string[];
  expires_at?: string;
  is_published?: boolean;
}