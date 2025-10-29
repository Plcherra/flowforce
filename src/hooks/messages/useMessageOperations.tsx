import { useAuth } from '../useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { MessageAttachment, SearchResult } from '@/types/messages';

export function useMessageOperations() {
  const { user } = useAuth();

  const sendMessage = async (
    channelId: string,
    content: string,
    options: { replyToId?: string; attachments?: MessageAttachment[] } = {},
  ) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    const { replyToId, attachments = [] } = options;
    const messageType =
      attachments.length === 0
        ? 'text'
        : attachments.every((attachment) => attachment.type?.startsWith('image/'))
          ? 'image'
          : 'file';

    const attachmentsPayload = attachments.map((attachment) => ({
      id: attachment.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined),
      name: attachment.name,
      path: attachment.path ?? null,
      url: attachment.url ?? null,
      type: attachment.type,
      size: attachment.size ?? null,
    }));

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
          reply_to_id: replyToId || null,
          attachments: attachmentsPayload,
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const searchMessages = async (query: string, channelId?: string): Promise<{ data: SearchResult[], error: any }> => {
    if (!user || query.trim().length < 2) return { data: [], error: null };

    try {
      let queryBuilder = supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_profile:profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          channel:message_channels!messages_channel_id_fkey(
            id,
            name,
            type,
            is_private
          )
        `)
        .textSearch('content', query)
        .order('created_at', { ascending: false })
        .limit(20);

      if (channelId) {
        queryBuilder = queryBuilder.eq('channel_id', channelId);
      }

      const { data, error } = await queryBuilder;

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  };

  return {
    sendMessage,
    searchMessages
  };
}
