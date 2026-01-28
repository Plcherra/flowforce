import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

import type {
  Announcement,
  CreateAnnouncementData,
} from "@/types/announcements";

export function useAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      subscribeToAnnouncements();
    } else {
      setAnnouncements([]);
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(
          `
          *,
          profiles!announcements_created_by_fkey (
            first_name,
            last_name,
            avatar_url
          )
        `,
        )
        .eq("is_published", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get read status for announcements
      const { data: readData, error: readError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      if (readError) throw readError;

      const readIds = new Set(readData?.map((r) => r.announcement_id) || []);

      const announcementsWithReadStatus = (data || []).map((item) => {
        // Ensure we only include the fields we need and type them correctly
        const announcement: Announcement = {
          id: item.id,
          title: item.title,
          content: item.content,
          priority: item.priority,
          target_audience: item.target_audience,
          target_ids: Array.isArray(item.target_ids) ? item.target_ids : [],
          created_by: item.created_by,
          company_id: item.company_id,
          expires_at: item.expires_at,
          is_published: item.is_published,
          created_at: item.created_at,
          updated_at: item.updated_at,
          creator_profile:
            item.profiles &&
            Array.isArray(item.profiles) &&
            item.profiles.length > 0 &&
            typeof item.profiles[0] === "object"
              ? item.profiles[0]
              : { first_name: "Unknown", last_name: "User" },
          is_read: readIds.has(item.id),
        };
        return announcement;
      });

      setAnnouncements(announcementsWithReadStatus);
    } catch (error) {
      logger.error("Error fetching announcements", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          fetchAnnouncements();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (announcementId: string) => {
    if (!user) return { error: "User not authenticated" };

    try {
      const { error } = await supabase.from("announcement_reads").upsert({
        announcement_id: announcementId,
        user_id: user.id,
      });

      if (error) throw error;

      // Update local state
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, is_read: true } : a,
        ),
      );

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const createAnnouncement = async (
    announcementData: CreateAnnouncementData,
  ) => {
    if (!user) return { data: null, error: "User not authenticated" };

    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: announcementData.title,
          content: announcementData.content,
          priority: announcementData.priority || "normal",
          target_audience: announcementData.target_audience || "all",
          target_ids: announcementData.target_ids || [],
          expires_at: announcementData.expires_at || null,
          is_published: announcementData.is_published ?? true,
          created_by: user.id,
          company_id:
            user.user_metadata?.company_id ||
            "00000000-0000-0000-0000-000000000000",
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAnnouncements(); // Refresh the list
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateAnnouncement = async (
    id: string,
    updates: Partial<Announcement>,
  ) => {
    if (!user) return { error: "User not authenticated" };

    try {
      const { error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchAnnouncements(); // Refresh the list
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user) return { error: "User not authenticated" };

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchAnnouncements(); // Refresh the list
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const getUnreadCount = () => {
    return announcements.filter((a) => !a.is_read).length;
  };

  const getUrgentAnnouncements = () => {
    return announcements.filter((a) => a.priority === "urgent" && !a.is_read);
  };

  return {
    announcements,
    loading,
    markAsRead,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refetchAnnouncements: fetchAnnouncements,
    unreadCount: getUnreadCount(),
    urgentAnnouncements: getUrgentAnnouncements(),
  };
}
