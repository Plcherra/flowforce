import { useEffect, useState } from "react";
import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { useProfile } from "@/hooks/useProfile";
import {
  coverageSummary,
  rollupLists,
  type CoverageShift,
} from "./overviewModel";

type LoadState<T> = { status: "loading" | "ready" | "error"; value: T };

function todayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useTodayCoverage() {
  const { profile, loading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [state, setState] = useState<LoadState<ReturnType<typeof coverageSummary>>>({
    status: "loading",
    value: { filled: 0, open: 0, total: 0 },
  });

  useEffect(() => {
    if (loading) return;
    if (!companyId) {
      setState({ status: "error", value: { filled: 0, open: 0, total: 0 } });
      return;
    }
    let cancelled = false;
    const range = todayRange();
    void db
      .from("schedules")
      .select("user_id, is_published, is_template")
      .eq("company_id", companyId)
      .gte("start_time", range.start)
      .lt("start_time", range.end)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ status: "error", value: { filled: 0, open: 0, total: 0 } });
          return;
        }
        setState({
          status: "ready",
          value: coverageSummary((data ?? []) as CoverageShift[]),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, loading]);

  return state;
}

export function useListStatus() {
  const { profile, loading } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const [state, setState] = useState<LoadState<{ overdue: number; completed: number }>>({
    status: "loading",
    value: { overdue: 0, completed: 0 },
  });

  useEffect(() => {
    if (loading) return;
    if (!companyId) {
      setState({ status: "error", value: { overdue: 0, completed: 0 } });
      return;
    }
    let cancelled = false;
    const range = todayRange();
    void Promise.all([
      db.from("forms").select("id, settings, status").eq("company_id", companyId),
      db
        .from("form_submissions")
        .select("form_id, submitted_at")
        .eq("company_id", companyId)
        .gte("submitted_at", range.start)
        .lt("submitted_at", range.end)
        .limit(200),
    ]).then(([formsResult, submissionsResult]) => {
      if (cancelled) return;
      if (formsResult.error || submissionsResult.error) {
        setState({ status: "error", value: { overdue: 0, completed: 0 } });
        return;
      }
      setState({
        status: "ready",
        value: rollupLists({
          now: new Date(),
          forms: formsResult.data ?? [],
          submissions: submissionsResult.data ?? [],
        }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, loading]);

  return state;
}
