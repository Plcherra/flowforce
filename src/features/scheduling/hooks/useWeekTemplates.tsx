import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";
import {
  parseWeekTemplateData,
  templateShiftsToInsertPayloads,
} from "@/features/scheduling/utils/weekTemplateSerializer";

type WeekTemplate = Tables<"week_templates">;

interface ApplyTemplateActions {
  bulkCreateShifts: (
    payloads: import("@/features/scheduling/types/mutations").ShiftInsertPayload[],
  ) => Promise<boolean>;
  assign: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  refetchAll: () => Promise<void>;
}

export function useWeekTemplates() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const [templates, setTemplates] = useState<WeekTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!companyId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("week_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error("Error fetching week templates", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTemplates().catch(() => {
      /* handled in fetchTemplates */
    });
  }, [fetchTemplates]);

  const createTemplate = async (
    templateData: Omit<WeekTemplate, "id" | "created_at" | "updated_at">,
  ) => {
    try {
      if (!companyId) {
        throw new Error("Company context is required to create a week template.");
      }

      const { data, error } = await supabase
        .from("week_templates")
        .insert({ ...templateData, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      setTemplates((prev) => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      logger.error("Error creating week template", { error, tags: ["error"] });
      return { data: null, error };
    }
  };

  const updateTemplate = async (
    id: string,
    patch: Partial<Pick<WeekTemplate, "name" | "description" | "template_data">>,
  ) => {
    try {
      const { data, error } = await supabase
        .from("week_templates")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)));
      return { data, error: null };
    } catch (error) {
      logger.error("Error updating week template", { error, tags: ["error"] });
      return { data: null, error };
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("week_templates").delete().eq("id", id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      return { error: null };
    } catch (error) {
      logger.error("Error deleting week template", { error, tags: ["error"] });
      return { error };
    }
  };

  const applyTemplate = async (
    templateId: string,
    targetWeekStart: Date,
    actions: ApplyTemplateActions,
  ) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const parsed = parseWeekTemplateData(template.template_data);
    if (!parsed) {
      throw new Error("Invalid template data");
    }

    const payloads = templateShiftsToInsertPayloads(parsed, targetWeekStart);
    const assigneeMap = parsed.shifts.map((row) => row.assignee_ids ?? []);

    const success = await actions.bulkCreateShifts(payloads);
    if (!success) {
      throw new Error("Failed to create shifts from template");
    }

    await actions.refetchAll();

    // Assign after bulk create — fetch created shifts for the week and match by order
    // Simpler approach: create one-by-one when assignees exist
    // For bulk path, re-fetch and assign by matching day/time/title
    const weekEnd = new Date(targetWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: createdShifts, error } = await supabase
      .from("schedules")
      .select("id, title, start_time")
      .eq("company_id", companyId!)
      .gte("start_time", targetWeekStart.toISOString())
      .lt("start_time", weekEnd.toISOString())
      .order("start_time");

    if (error) throw error;

    for (let i = 0; i < parsed.shifts.length; i++) {
      const assignees = assigneeMap[i] ?? [];
      const templateShift = parsed.shifts[i];
      const match = (createdShifts ?? []).find((row) => {
        if (row.title !== templateShift.title) return false;
        const start = new Date(row.start_time);
        const [h, m] = templateShift.startTime.split(":").map(Number);
        return start.getHours() === h && start.getMinutes() === m;
      });
      if (!match) continue;
      for (const userId of assignees) {
        await actions.assign(match.id, userId, "assigned");
      }
    }

    await actions.refetchAll();
    return true;
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    refetchTemplates: fetchTemplates,
  };
}
