import type { ChatUser } from './users';
import { logger } from '@/utils/logger';

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  edited?: boolean;
  attachments?: ChatAttachment[];
}

export type ConversationType = 'direct' | 'team';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  participantIds: string[];
  messages: ChatMessage[];
  unreadCount: number;
  topic?: string;
}

const STORAGE_KEY = 'connectflow:chat-conversations';

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn('Failed to parse stored conversations', { error, tags: ['warning'] });
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function getConversationName(conversation: Conversation, users: Map<string, ChatUser>, currentUserId: string) {
  if (conversation.type === 'team') {
    return conversation.name;
  }
  const counterpart = conversation.participantIds.find((id) => id !== currentUserId);
  if (!counterpart) return conversation.name;
  return users.get(counterpart)?.name ?? conversation.name;
}
