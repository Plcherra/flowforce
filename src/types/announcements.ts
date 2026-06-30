export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string;
  targetids: unknown; // Array of user/group IDs, stored as JSON
  created_by: string;
  company_id: string;
  expires_at?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  creatorprofile?: {
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
  targetids?: string[];
  expires_at?: string;
  is_published?: boolean;
}
