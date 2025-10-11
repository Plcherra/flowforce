import type { Tables } from '@/integrations/supabase/public-types';

export type MessageChannel = Tables<'message_channels'> & {
  channel_members?: {
    user_id: string;
    role: string;
    last_read_at: string | null;
  }[];
  created_profile?: {
    first_name: string;
    last_name: string;
  };
  department?: {
    name: string;
  };
  unread_count?: number;
};

export type Message = Tables<'messages'> & {
  sender_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  reply_to_message?: {
    content: string;
    sender_profile: {
      first_name: string;
      last_name: string;
    };
  } | null;
  reactions?: {
    emoji: string;
    count: number;
    users: { first_name: string; last_name: string }[];
  }[];
};

export interface CreateChannelData {
  name: string;
  description?: string;
  type: string;
  department_id?: string;
  is_private?: boolean;
  member_ids?: string[];
}

export interface MessageAttachment {
  id?: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  path?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  sender_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  channel: {
    id: string;
    name: string;
    type: string;
    is_private: boolean;
  };
}

export interface ThreadMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  parentId?: string;
  replies?: ThreadMessage[];
  replyCount?: number;
}