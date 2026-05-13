import { supabase } from "@/integrations/supabase/client";
import { messagesRepository } from "@/features/messages/api/messagesRepository";
import type { CreateChannelData, MessageChannel } from "@/types/messages";
import { logger } from "@/utils/logger";

export async function updateChannel(
  channelId: string,
  payload: Partial<
    Pick<MessageChannel, "name" | "description" | "type" | "is_private">
  >,
) {
  const { error } = await supabase
    .from("message_channels")
    .update({
      name: payload.name?.trim(),
      description: payload.description?.trim() || null,
      type: payload.type,
      is_private: payload.is_private,
    })
    .eq("id", channelId);

  if (error) throw error;
}

export async function deleteChannel(
  channelId: string,
  userId: string,
  companyId?: string | null,
) {
  await messagesRepository.deleteChannel(channelId, userId, companyId);
}

export async function createChannel(
  channelData: CreateChannelData,
  ownerId: string,
) {
  let channel: MessageChannel;

  try {
    // Step 1: Create the channel
    channel = await messagesRepository.createChannel(channelData, ownerId);
    logger.debug("Channel created successfully", {
      channelId: channel.id,
      tags: ["channels"],
    });
  } catch (error) {
    logger.error("Failed to create channel", {
      error: error instanceof Error ? error : new Error(String(error)),
      context: { ownerId, channelData },
      tags: ["error", "channels"],
    });
    throw error;
  }

  // Step 2: Add members to the channel
  // Ensure owner is always included and is an admin
  const uniqueMembers = Array.from(
    new Set([ownerId, ...(channelData.member_ids ?? [])]),
  ).map((memberId) => ({
    user_id: memberId,
    role: memberId === ownerId ? "admin" : "member",
  }));

  if (uniqueMembers.length === 0) {
    logger.warn("No members to add to channel", {
      channelId: channel.id,
      tags: ["channels"],
    });
    return channel;
  }

  try {
    await messagesRepository.addChannelMembers(channel.id, uniqueMembers);
    logger.debug("Channel members added successfully", {
      channelId: channel.id,
      memberCount: uniqueMembers.length,
      tags: ["channels"],
    });
  } catch (error) {
    // If adding members fails, log detailed error but don't delete channel
    // The channel exists but may be orphaned (no members)
    // User can manually add members later or we can retry
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const supabaseError = errorObj as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };

    // Check for RLS recursion error specifically
    const isRLSRecursionError =
      supabaseError.code === "42P17" ||
      (supabaseError.message?.toLowerCase().includes("infinite recursion") ?? false);

    if (isRLSRecursionError) {
      logger.error(
        "RLS policy recursion error when adding channel members - this indicates a database policy issue",
        {
          error: errorObj,
          context: {
            channelId: channel.id,
            memberCount: uniqueMembers.length,
            members: uniqueMembers.map((m) => ({
              user_id: m.user_id,
              role: m.role,
            })),
            errorCode: supabaseError.code,
            errorDetails: supabaseError.details,
            errorHint: supabaseError.hint,
            note: "Channel was created but members could not be added due to RLS policy recursion. Please contact support.",
          },
          tags: ["error", "channels", "rls"],
        },
      );

      // Wrap the error with a more user-friendly message
      const userFriendlyError = new Error(
        "Channel created but failed to add members due to a policy configuration issue. Please try adding members manually or contact support.",
      );
      (userFriendlyError as Error & { originalError?: Error }).originalError =
        errorObj;
      throw userFriendlyError;
    }

    logger.error("Failed to add members to channel, channel may be orphaned", {
      error: errorObj,
      context: {
        channelId: channel.id,
        memberCount: uniqueMembers.length,
        members: uniqueMembers.map((m) => ({
          user_id: m.user_id,
          role: m.role,
        })),
        errorCode: supabaseError.code,
        errorDetails: supabaseError.details,
        errorHint: supabaseError.hint,
      },
      tags: ["error", "channels"],
    });

    // Still throw the error so the UI can show it
    throw errorObj;
  }

  return channel;
}

export async function joinChannel(channelId: string, userId: string) {
  await messagesRepository.addChannelMembers(channelId, [
    { user_id: userId, role: "member" },
  ]);
}

export async function updateLastRead(channelId: string, userId: string) {
  await messagesRepository.updateLastRead(channelId, userId);
}
