import { useState, useEffect, useCallback } from "react";
import { useMessageChannels } from "@/features/messages/hooks/useMessageChannels";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export interface ChannelData {
  name: string;
  description: string;
  type: string;
  is_private: boolean;
  members: string[];
}

export interface WizardUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  employment_status?: string | null;
  role?: string | null;
}

export function useChannelWizard(open: boolean) {
  const { createChannel } = useMessageChannels();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { profile } = useProfile();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberOptions, setMemberOptions] = useState<WizardUser[]>([]);
  const [channelData, setChannelData] = useState<ChannelData>({
    name: "",
    description: "",
    type: "group",
    is_private: false,
    members: [],
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const selectFields =
        "id, first_name, last_name, email, avatar_url, employment_status, role";
      const currentProfileId = profile?.id ?? currentUser?.id ?? null;
      const companyId = profile?.companyId ?? profile?.company_id ?? null;
      const canIncludeSelf = [
        "admin",
        "owner",
        "company_admin",
        "manager",
      ].includes((profile?.role ?? "").toLowerCase());

      const applyVisibility = (entries: WizardUser[] | null | undefined) => {
        const list = entries ?? [];
        if (canIncludeSelf || !currentProfileId) {
          return list;
        }
        return list.filter((entry) => entry.id !== currentProfileId);
      };

      try {
        if (!companyId) {
          logger.warn("Company context required to load channel members", {
            tags: ["warning"],
          });
          setMemberOptions([]);
          return;
        }

        const { data: activeData, error: activeError } = await supabase
          .from("profiles")
          .select(selectFields)
          .eq("company_id", companyId)
          .eq("employment_status", "active")
          .order("first_name");

        if (activeError) throw activeError;

        let visibleUsers = applyVisibility(activeData);

        if (visibleUsers.length === 0) {
          // Fallback: still filter by company_id
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("profiles")
            .select(selectFields)
            .eq("company_id", companyId)
            .order("first_name");

          if (fallbackError) throw fallbackError;
          visibleUsers = applyVisibility(fallbackData);
        }

        const deduped = Array.from(
          new Map(visibleUsers.map((entry) => [entry.id, entry])).values(),
        );

        if (!cancelled) {
          setMemberOptions(deduped);
          setChannelData((prev) => ({
            ...prev,
            members: prev.members.filter((id) =>
              deduped.some((user) => user.id === id),
            ),
          }));
        }
      } catch (error) {
        logger.error("Error fetching users for channel wizard", {
          error,
          tags: ["error"],
        });
        if (!cancelled) {
          setMemberOptions([]);
          toast({
            title: "Unable to load teammates",
            description: "We could not fetch the user list. Try again shortly.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    };

    fetchMembers();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, open, profile?.id, profile?.role, toast]);

  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const toggleMember = useCallback((userId: string) => {
    setChannelData((prev) => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId],
    }));
  }, []);

  const handleSubmit = useCallback(
    async (onChannelCreated?: (channelId: string) => void) => {
      if (!channelData.name.trim()) return;

      setLoading(true);
      try {
        const { data, error } = await createChannel({
          name: channelData.name.trim(),
          description: channelData.description.trim() || undefined,
          type: channelData.type,
          is_private: channelData.is_private,
          member_ids: channelData.members,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Channel created successfully",
        });

        if (onChannelCreated && data?.id) {
          onChannelCreated(data.id);
        }

        setChannelData({
          name: "",
          description: "",
          type: "group",
          is_private: false,
          members: [],
        });
        setCurrentStep(1);
        return true;
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        const supabaseError = errorObj as Error & {
          code?: string;
          details?: string;
          hint?: string;
          message?: string;
        };

        logger.error("Error creating channel:", {
          error: errorObj,
          context: {
            errorCode: supabaseError.code,
            errorMessage: supabaseError.message,
            errorDetails: supabaseError.details,
            errorHint: supabaseError.hint,
          },
          tags: ["error"],
        });

        const userMessage =
          supabaseError.code === "42501"
            ? "Permission denied. Please check your database RLS policies."
            : supabaseError.message || "Failed to create channel";

        toast({
          title: "Error",
          description: userMessage,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [channelData, createChannel, toast],
  );

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return channelData.name.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }, [currentStep, channelData.name]);

  const reset = useCallback(() => {
    setChannelData({
      name: "",
      description: "",
      type: "group",
      is_private: false,
      members: [],
    });
    setCurrentStep(1);
  }, []);

  return {
    currentStep,
    loading,
    loadingMembers,
    memberOptions,
    channelData,
    setChannelData,
    handleNext,
    handleBack,
    toggleMember,
    handleSubmit,
    canProceed,
    reset,
  };
}
