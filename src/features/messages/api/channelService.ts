import { messagesRepository } from '@/repositories/messagesRepository';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { CreateChannelData, MessageChannel } from '@/types/messages';

export async function updateChannel(channelId: string, payload: Partial<Pick<MessageChannel, 'name' | 'description' | 'type' | 'is_private'>>) {
  const { error } = await supabase
    .from('message_channels')
    .update({
      name: payload.name?.trim(),
      description: payload.description?.trim() || null,
      type: payload.type,
      is_private: payload.is_private,
    })
    .eq('id', channelId);

  if (error) throw error;
}

export async function deleteChannel(channelId: string, userId: string) {
  await messagesRepository.deleteChannel(channelId, userId);
}

export async function createChannel(channelData: CreateChannelData, ownerId: string) {
  const channel = await messagesRepository.createChannel(channelData, ownerId);
  const uniqueMembers = Array.from(new Set([ownerId, ...(channelData.member_ids ?? [])])).map((memberId) => ({
    user_id: memberId,
    role: memberId === ownerId ? 'admin' : 'member',
  }));
  await messagesRepository.addChannelMembers(channel.id, uniqueMembers);
  return channel;
}

export async function joinChannel(channelId: string, userId: string) {
  await messagesRepository.addChannelMembers(channelId, [{ user_id: userId, role: 'member' }]);
}

export async function updateLastRead(channelId: string, userId: string) {
  await messagesRepository.updateLastRead(channelId, userId);
}
