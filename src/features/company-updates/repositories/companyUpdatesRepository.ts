import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyUpdate } from "@/types/companyUpdates";

type ListUpdatesParams = {
  companyId: string;
  page: number;
  pageSize: number;
  statusFilter?: CompanyUpdate["status"] | CompanyUpdate["status"][];
  searchTerm?: string;
};

type ListDraftsParams = {
  companyId: string;
};

type ListEngagementSummariesParams = {
  companyId: string;
};

type ListReactionsParams = {
  companyId: string;
  userId: string;
  updateIds: string[];
};

type ListCommentsParams = {
  companyId: string;
  updateIds: string[];
};

type CreateUpdateParams = {
  companyId: string;
  payload: Record<string, unknown>;
};

type UpdateStatusParams = {
  companyId: string;
  updateId: string;
  status: CompanyUpdate["status"];
};

type TogglePinParams = {
  companyId: string;
  updateId: string;
  isPinned: boolean;
};

type DeleteUpdateParams = {
  companyId: string;
  updateId: string;
};

type UpdateUpdateParams = {
  companyId: string;
  updateId: string;
  payload: Partial<Record<string, unknown>>;
};

type ReactionMutationParams = {
  companyId: string;
  updateId: string;
  userId: string;
  reactionType: "like" | "view";
};

type DeleteReactionParams = ReactionMutationParams;

type CreateCommentParams = {
  companyId: string;
  updateId: string;
  userId: string;
  content: string;
};

const profileSchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const engagementSchema = z.object({
  engagement_score: z.number().nullable().optional(),
  ai_summary: z.string().nullable().optional(),
  last_analyzed: z.string().nullable().optional(),
});

const engagementRowSchema = z.object({
  id: z.string(),
  updateid: z.string(),
  company_id: z.string(),
  likes_count: z.number().nullable().optional(),
  comments_count: z.number().nullable().optional(),
  views_count: z.number().nullable().optional(),
  engagement_score: z.number().nullable().optional(),
  sentiment_score: z.number().nullable().optional(),
  ai_summary: z.string().nullable().optional(),
  last_analyzed: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

const companyUpdateRowSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  title: z.string(),
  body: z.string(),
  rich_content: z.string().nullable().optional(),
  update_type: z.string(),
  priority: z.string(),
  status: z.string(),
  background_style: z.unknown().nullable().optional(),
  recipients: z.unknown().nullable().optional(),
  publishing_settings: z.unknown().nullable().optional(),
  assigned_employees: z.array(z.string()).nullable().optional(),
  author_id: z.string().nullable().optional(),
  author_name: z.string().nullable().optional(),
  author_role: z.string().nullable().optional(),
  author_avatar: z.string().nullable().optional(),
  publish_date: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  is_pinned: z.boolean(),
  likes_count: z.number(),
  comments_count: z.number(),
  views_count: z.number(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  authorprofile: profileSchema,
  company_update_engagement: z.array(engagementSchema).optional().nullable(),
});

const reactionRowSchema = z.object({
  updateid: z.string(),
  reaction_type: z.union([z.literal("like"), z.literal("view")]),
});

const commentRowSchema = z.object({
  id: z.string(),
  updateid: z.string(),
  company_id: z.string(),
  author_id: z.string(),
  content: z.string(),
  likes_count: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  author: profileSchema,
});

const parseSupabaseData = <T>(schema: z.ZodType<T>, data: unknown): T => {
  return schema.parse(data);
};

export type CompanyUpdateRow = z.infer<typeof companyUpdateRowSchema>;
export type ReactionRow = z.infer<typeof reactionRowSchema>;
export type CommentRow = z.infer<typeof commentRowSchema>;
export type CompanyUpdateEngagementRow = z.infer<typeof engagementRowSchema>;

const listUpdates = async ({
  companyId,
  page,
  pageSize,
  statusFilter,
  searchTerm,
}: ListUpdatesParams) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("company_updates")
    .select(
      `
        *,
        authorprofile:profiles!company_updates_author_id_fkey (id, first_name, last_name, avatar_url, role),
        company_update_engagement (
          engagement_score,
          ai_summary,
          last_analyzed
        )
      `,
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order("is_pinned", { ascending: false })
    .order("publish_date", { ascending: false });

  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      query = query.in("status", statusFilter);
    } else {
      query = query.eq("status", statusFilter);
    }
  }

  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  const parsed = parseSupabaseData(z.array(companyUpdateRowSchema), data ?? []);
  return {
    records: parsed,
    total: count ?? parsed.length,
  };
};

const listDraftUpdates = async ({ companyId }: ListDraftsParams) => {
  const { data, error } = await supabase
    .from("company_updates")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return parseSupabaseData(z.array(companyUpdateRowSchema), data ?? []);
};

const listEngagementSummaries = async ({
  companyId,
}: ListEngagementSummariesParams) => {
  const { data, error } = await supabase
    .from("company_update_engagement")
    .select("*")
    .eq("company_id", companyId)
    .order("last_analyzed", { ascending: false });

  if (error) {
    throw error;
  }

  return parseSupabaseData(z.array(engagementRowSchema), data ?? []);
};

const listReactions = async ({
  companyId,
  userId,
  updateIds,
}: ListReactionsParams) => {
  if (updateIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_update_reactions")
    .select("updateid, reaction_type")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .in("updateid", updateIds);

  if (error) {
    throw error;
  }

  return parseSupabaseData(z.array(reactionRowSchema), data ?? []);
};

const listComments = async ({ companyId, updateIds }: ListCommentsParams) => {
  if (updateIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_update_comments")
    .select(
      "*, author:profiles!company_update_comments_author_id_fkey (id, first_name, last_name, avatar_url)",
    )
    .eq("company_id", companyId)
    .in("updateid", updateIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return parseSupabaseData(z.array(commentRowSchema), data ?? []);
};

const createUpdate = async ({ companyId, payload }: CreateUpdateParams) => {
  const { error } = await supabase.from("company_updates").insert({
    company_id: companyId,
    ...payload,
  });

  if (error) {
    throw error;
  }
};

const updateStatus = async ({
  companyId,
  updateId,
  status,
}: UpdateStatusParams) => {
  const { error } = await supabase
    .from("company_updates")
    .update({ status })
    .eq("company_id", companyId)
    .eq("id", updateId);

  if (error) {
    throw error;
  }
};

const updateUpdate = async ({
  companyId,
  updateId,
  payload,
}: UpdateUpdateParams) => {
  const { error } = await supabase
    .from("company_updates")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", updateId);

  if (error) {
    throw error;
  }
};

const togglePin = async ({
  companyId,
  updateId,
  isPinned,
}: TogglePinParams) => {
  const { error } = await supabase
    .from("company_updates")
    .update({ is_pinned: isPinned })
    .eq("company_id", companyId)
    .eq("id", updateId);

  if (error) {
    throw error;
  }
};

const deleteUpdate = async ({ companyId, updateId }: DeleteUpdateParams) => {
  const { error } = await supabase
    .from("company_updates")
    .delete()
    .eq("company_id", companyId)
    .eq("id", updateId);

  if (error) {
    throw error;
  }
};

const upsertReaction = async ({
  companyId,
  updateId,
  userId,
  reactionType,
}: ReactionMutationParams) => {
  const { error } = await supabase.from("company_update_reactions").upsert(
    {
      company_id: companyId,
      updateid: updateId,
      user_id: userId,
      reaction_type: reactionType,
    },
    { onConflict: "updateid,user_id,reaction_type" },
  );

  if (error) {
    throw error;
  }
};

const deleteReaction = async ({
  companyId,
  updateId,
  userId,
  reactionType,
}: DeleteReactionParams) => {
  const { error } = await supabase
    .from("company_update_reactions")
    .delete()
    .eq("company_id", companyId)
    .eq("updateid", updateId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType);

  if (error) {
    throw error;
  }
};

const createComment = async ({
  companyId,
  updateId,
  userId,
  content,
}: CreateCommentParams) => {
  const { error } = await supabase.from("company_update_comments").insert({
    company_id: companyId,
    updateid: updateId,
    author_id: userId,
    content,
  });

  if (error) {
    throw error;
  }
};

export const companyUpdatesRepository = {
  listUpdates,
  listDraftUpdates,
  listEngagementSummaries,
  listReactions,
  listComments,
  createUpdate,
  updateUpdate,
  updateStatus,
  togglePin,
  deleteUpdate,
  upsertReaction,
  deleteReaction,
  createComment,
};
