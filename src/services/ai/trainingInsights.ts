import { supabase } from "@/integrations/supabase/client";

interface TrainingInsightSummary {
  totalCompletions: number;
  avgXP: number;
  suggestions: string;
}

const DEFAULT_LOOKBACK_DAYS = 180;
const DEFAULT_RECORD_LIMIT = 500;

export async function analyzeTrainingProgress(
  companyId: string,
  options: { lookbackDays?: number; limit?: number } = {},
): Promise<TrainingInsightSummary> {
  if (!companyId) {
    throw new Error(
      "Company context is required to analyze training progress.",
    );
  }

  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const limit = options.limit ?? DEFAULT_RECORD_LIMIT;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  const { data, error } = await supabase
    .from("learning_completions")
    .select("xp_earned, passed, completed_at")
    .eq("company_id", companyId)
    .gte("completed_at", cutoffDate.toISOString())
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const completions = data ?? [];
  const totalCompletions = completions.length;
  const totalXp = completions.reduce(
    (sum, record) => sum + (record.xp_earned ?? 0),
    0,
  );
  const avgXP = totalCompletions > 0 ? totalXp / totalCompletions : 0;

  let suggestions: string;
  if (totalCompletions === 0) {
    suggestions =
      "No completions logged yet. Encourage managers to assign onboarding pathways to new hires.";
  } else if (avgXP < 200) {
    suggestions = `Encourage blended training for roles with low XP gain (${avgXP.toFixed(0)} avg).`;
  } else {
    suggestions = `Great momentum! Learners average ${avgXP.toFixed(0)} XP per course—consider advanced certifications next.`;
  }

  return {
    totalCompletions,
    avgXP,
    suggestions,
  };
}
