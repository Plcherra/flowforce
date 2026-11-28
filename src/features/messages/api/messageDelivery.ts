import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { messageRecipientIds } from "@/features/messages/channelScope";
import { logger } from "@/utils/logger";

const PREVIEW_LIMIT = 140;

export async function notifyMessageRecipients(input: {
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
}) {
  const { data: channelRow, error: channelError } = await db
    .from("message_channels")
    .select("company_id")
    .eq("id", input.channelId)
    .maybeSingle();
  if (channelError) throw channelError;

  const companyId = channelRow?.company_id ?? null;
  if (!companyId) {
    throw new Error("Channel company is required for message notifications");
  }

  const { data, error } = await db
    .from("channel_members")
    .select("user_id")
    .eq("channel_id", input.channelId);

  if (error) throw error;

  const recipients = messageRecipientIds(data ?? [], input.senderId);
  if (recipients.length === 0) return;

  const preview = input.content.trim().slice(0, PREVIEW_LIMIT);
  const { error: insertError } = await db.from("task_notifications").insert(
    recipients.map((userId) => ({
      company_id: companyId,
      user_id: userId,
      task_id: null,
      type: "direct_message",
      title: input.senderName,
      message: preview,
      metadata: {
        channel_id: input.channelId,
        kind: "direct_message",
      },
    })),
  );

  if (insertError) {
    logger.error("Message notification insert failed", {
      error: insertError,
      tags: ["error", "messages"],
    });
    throw insertError;
  }
}
