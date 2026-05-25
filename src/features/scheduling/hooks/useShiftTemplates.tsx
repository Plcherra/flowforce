import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";

type ShiftTemplate = Tables<"shift_templates">;

export function useShiftTemplates() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [companyId]);

  const fetchTemplates = async () => {
    if (!companyId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("shift_templates")
        .select(
          `
          *,
          job_position:positions(id, name, role)
        `,
        )
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error("Error fetching shift templates", {
        error,
        tags: ["error"],
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (
    templateData: Omit<ShiftTemplate, "id" | "created_at" | "updated_at">,
  ) => {
    try {
      if (!companyId) {
        throw new Error("Company context is required to create a shift template.");
      }

      const { data, error } = await supabase
        .from("shift_templates")
        .insert({ ...templateData, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      setTemplates((prev) => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      logger.error("Error creating shift template", { error, tags: ["error"] });
      return { data: null, error };
    }
  };

  return {
    templates,
    loading,
    createTemplate,
    refetchTemplates: fetchTemplates,
  };
}
