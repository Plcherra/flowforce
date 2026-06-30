import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

export interface Position {
  id: string;
  name: string;
  description?: string;
  role: "staff" | "supervisor" | "manager" | "admin";
  color: string;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  permissions?: any;
}

export interface PositionAssignment {
  id: string;
  user_id: string;
  position_id: string;
  company_id: string;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  position?: Position;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export function usePositions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<PositionAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPositions();
      fetchAssignments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [user]);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPositions(
        ((data as any[]) || []).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          role: item.role as "staff" | "supervisor" | "manager" | "admin",
          color: item.color,
          is_active: item.is_active,
          company_id: item.company_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by,
          permissions: item.permissions,
        })),
      );
    } catch (error) {
      logger.error("Error fetching positions:", { error, tags: ["error"] });
      toast({
        variant: "destructive",
        title: "Unable to load positions",
        description: "Refresh and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      // Fetch assignments with positions first
      const { data: assignmentData, error } = await supabase
        .from("position_assignments")
        .select(
          `
          *,
          position:positions(*)
        `,
        )
        .eq("is_active", true);

      if (error) throw error;

      // Fetch user profiles separately to avoid relationship issues
      if (assignmentData && assignmentData.length > 0) {
        const userIds = [...new Set(assignmentData.map((a) => a.user_id))];

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url")
            .in("id", userIds);

          const profileMap: Record<string, any> = {};
          profiles?.forEach((profile) => {
            profileMap[profile.id] = profile;
          });

          // Merge profile data with assignment data
          const enrichedData = assignmentData.map((assignment) => ({
            ...assignment,
            profile: profileMap[assignment.user_id] || null,
          }));

          setAssignments(enrichedData as any[]);
        } else {
          setAssignments(assignmentData as any[]);
        }
      } else {
        setAssignments([]);
      }
    } catch (error) {
      logger.error("Error fetching position assignments:", {
        error,
        tags: ["error"],
      });
    }
  };

  const createPosition = async (
    positionData: Omit<
      Position,
      "id" | "created_at" | "updated_at" | "company_id" | "created_by"
    >,
  ) => {
    try {
      // Get user's company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("User must be associated with a company");
      }

      const { data, error } = await supabase
        .from("positions")
        .insert({
          ...positionData,
          company_id: profile.company_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const mappedData = {
        id: data.id,
        name: data.name,
        description: data.description,
        role: data.role as "staff" | "supervisor" | "manager" | "admin",
        color: data.color,
        is_active: data.is_active,
        company_id: data.company_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by,
        permissions: data.permissions,
      };

      setPositions((prev) => [...prev, mappedData]);
      toast({
        title: "Position created",
        description: `${mappedData.name} is now available for assignments.`,
      });
      return { data, error: null };
    } catch (error) {
      logger.error("Error creating position:", { error, tags: ["error"] });
      toast({
        variant: "destructive",
        title: "Unable to create position",
        description: "Check the form fields and try again.",
      });
      return { data: null, error };
    }
  };

  const updatePosition = async (id: string, updates: Partial<Position>) => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const mappedData = {
        id: data.id,
        name: data.name,
        description: data.description,
        role: data.role as "staff" | "supervisor" | "manager" | "admin",
        color: data.color,
        is_active: data.is_active,
        company_id: data.company_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by,
        permissions: data.permissions,
      };

      setPositions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...mappedData } : p)),
      );
      toast({
        title: "Position updated",
        description: `${mappedData.name} has been refreshed.`,
      });
      return { data, error: null };
    } catch (error) {
      logger.error("Error updating position:", { error, tags: ["error"] });
      toast({
        variant: "destructive",
        title: "Unable to update position",
        description: "Please try again.",
      });
      return { data: null, error };
    }
  };

  const deletePosition = async (id: string) => {
    try {
      const { error } = await supabase
        .from("positions")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setPositions((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Position archived",
        description: "It will no longer appear in new assignments.",
      });
      return { error: null };
    } catch (error) {
      logger.error("Error deleting position:", { error, tags: ["error"] });
      toast({
        variant: "destructive",
        title: "Unable to delete position",
        description: "Please try again.",
      });
      return { error };
    }
  };

  const assignUserToPosition = async (userId: string, positionId: string) => {
    try {
      // Get user's company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("User must be associated with a company");
      }

      const { data, error } = await supabase
        .from("position_assignments")
        .insert({
          user_id: userId,
          position_id: positionId,
          company_id: profile.company_id,
          assigned_by: user?.id,
        })
        .select(
          `
          *,
          position:positions(*)
        `,
        )
        .single();

      if (error) throw error;

      setAssignments((prev) => [...prev, data as any]);
      toast({
        title: "User assigned",
        description: "The teammate now holds this position.",
      });
      return { data, error: null };
    } catch (error) {
      logger.error("Error assigning user to position", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to assign user",
        description: "Please try again.",
      });
      return { data: null, error };
    }
  };

  const removeUserFromPosition = async (userId: string, positionId: string) => {
    try {
      const { error } = await supabase
        .from("position_assignments")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("position_id", positionId);

      if (error) throw error;

      setAssignments((prev) =>
        prev.filter(
          (a) => !(a.user_id === userId && a.position_id === positionId),
        ),
      );
      toast({
        title: "User removed",
        description: "The teammate no longer holds this position.",
      });
      return { error: null };
    } catch (error) {
      logger.error("Error removing user from position:", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to remove user",
        description: "Please try again.",
      });
      return { error };
    }
  };

  const getUserPositions = (userId: string) => {
    return assignments
      .filter((a) => a.user_id === userId && a.is_active)
      .map((a) => a.position)
      .filter(Boolean) as Position[];
  };

  const getPositionUsers = (positionId: string) => {
    return assignments
      .filter((a) => a.position_id === positionId && a.is_active)
      .map((a) => a.profiles)
      .filter(Boolean);
  };

  const getPositionsByRole = (role: string) => {
    return positions.filter((position) => position.role === role);
  };

  return {
    positions,
    assignments,
    loading,
    createPosition,
    updatePosition,
    deletePosition,
    assignUserToPosition,
    removeUserFromPosition,
    getUserPositions,
    getPositionUsers,
    getPositionsByRole,
    refetchPositions: fetchPositions,
    refetchAssignments: fetchAssignments,
  };
}
