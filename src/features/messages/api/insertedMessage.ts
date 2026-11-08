import { z } from "zod";

import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import type { Message } from "@/types/messages";

const ProfileSchema = z
  .object({
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const InsertedRowSchema = z
  .object({
    id: z.string(),
    channel_id: z.string().nullable().optional(),
    sender_id: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    edited_at: z.string().nullable().optional(),
    attachments: z.array(z.unknown()).nullable().optional(),
    senderprofile: z.union([ProfileSchema, z.array(ProfileSchema)]).optional(),
  })
  .passthrough();

export async function loadInsertedMessage(
  messageId: string,
): Promise<Message | null> {
  const { data, error } = await db
    .from("messages")
    .select(
      `
      *,
      senderprofile:profiles!messages_sender_id_fkey(first_name, last_name, avatar_url)
    `,
    )
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const parsed = InsertedRowSchema.parse(data);
  const profileSource = Array.isArray(parsed.senderprofile)
    ? parsed.senderprofile[0]
    : parsed.senderprofile;

  return {
    ...parsed,
    content: parsed.content ?? "",
    senderid: parsed.sender_id ?? "",
    senderprofile: {
      first_name: profileSource?.first_name ?? "",
      last_name: profileSource?.last_name ?? "",
      avatar_url: profileSource?.avatar_url ?? null,
    },
    attachments: parsed.attachments ?? [],
  } as Message;
}
