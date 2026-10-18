import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";

export type ShiftTemplate = Tables<"shift_templates"> & {
  job_position?: {
    id: string;
    name: string | null;
    role: string | null;
  } | null;
};

export function useShiftTemplates() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
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
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      const rows = data ?? [];
      const positionIds = [
        ...new Set(
          rows
            .map((row) => row.job_position_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const positionsById = new Map<
        string,
        { id: string; name: string | null; role: string | null }
      >();
      if (positionIds.length > 0) {
        const { data: positions, error: positionError } = await supabase
          .from("positions")
          .select("id, name, role")
          .in("id", positionIds);
        if (!positionError) {
          for (const position of positions ?? []) {
            positionsById.set(position.id, position);
          }
        }
      }
      setTemplates(
        rows.map((row) => ({
          ...row,
          job_position: row.job_position_id
            ? (positionsById.get(row.job_position_id) ?? null)
            : null,
        })),
      );
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

      const { job_position: _jobPosition, ...row } = templateData;
      const { data, error } = await supabase
        .from("shift_templates")
        .insert({ ...row, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      const saved: ShiftTemplate = {
        ...data,
        job_position: data.job_position_id
          ? {
              id: data.job_position_id,
              name: null,
              role: null,
            }
          : null,
      };
      setTemplates((prev) => [...prev.filter((item) => item.id !== saved.id), saved]);
      return { data: saved, error: null };
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
